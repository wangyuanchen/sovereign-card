/**
 * Fetch DNS records a user must configure from Vercel APIs.
 *
 * Uses two Vercel endpoints:
 *   1. GET /v9/projects/{id}/domains/{domain}
 *      → Returns `verification[]` with TXT records needed for domain ownership proof
 *
 *   2. GET /v6/domains/{domain}/config?projectIdOrName={id}
 *      → Returns `recommendedCNAME` and `recommendedIPv4` — the project-specific
 *        CNAME/A targets the user must point their DNS to.
 *        e.g. `02b4cfea893133a6.vercel-dns-017.com` (NOT the generic cname.vercel-dns.com)
 */
/**
 * Strip the apex domain suffix from a full DNS name to get just the prefix.
 * e.g. "_vercel.yuansen.dpdns.org" with apex "yuansen.dpdns.org" → "_vercel"
 *      "card.yuansen.dpdns.org" with apex "yuansen.dpdns.org" → "card"
 *      "yuansen.dpdns.org" with apex "yuansen.dpdns.org" → "@"
 */
function stripApex(fullName: string, apex: string): string {
  if (fullName === apex) return "@";
  if (fullName.endsWith(`.${apex}`)) {
    return fullName.slice(0, -(apex.length + 1));
  }
  return fullName;
}

export async function fetchVercelDnsRecords(
  domain: string
): Promise<{ type: string; name: string; value: string }[]> {
  const records: { type: string; name: string; value: string }[] = [];
  const token = process.env.SC_VERCEL_TOKEN!;
  const projectId = process.env.SC_VERCEL_PROJECT_ID!;

  // Will be determined from Vercel's apexName response
  let apexName: string | null = null;

  // ── 1. Get project domain details → TXT verification records ──
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 0 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      console.log("[vercel] GET project domain response:", JSON.stringify(data, null, 2));

      // Vercel tells us the real apex domain (handles public suffix correctly)
      apexName = (data.apexName as string) || null;

      // Extract TXT verification records — show only prefix, not full domain
      const apex = apexName || domain;
      if (Array.isArray(data.verification)) {
        for (const v of data.verification) {
          const fullName = v.domain || `_vercel.${apex}`;
          records.push({
            type: v.type || "TXT",
            name: stripApex(fullName, apex),
            value: v.value || "",
          });
        }
      }
    } else {
      const errText = await res.text().catch(() => "");
      console.error("[vercel] GET project domain failed:", res.status, errText);
    }
  } catch (err) {
    console.error("[vercel] GET project domain error:", err);
  }

  // ── Determine subdomain vs apex using Vercel's apexName ───────
  // apexName is the registrable domain Vercel identified, e.g.:
  //   domain = "card.yuansen.dpdns.org", apexName = "yuansen.dpdns.org"
  //   domain = "blog.example.com",       apexName = "example.com"
  //   domain = "example.com",            apexName = "example.com"
  const apex = apexName || domain;
  const isSubdomain = domain.toLowerCase() !== apex.toLowerCase();
  const recordName = isSubdomain ? stripApex(domain, apex) : "@";

  // ── 2. Get domain config → recommended CNAME / A (project-specific) ──
  let cnameTarget = "cname.vercel-dns.com"; // fallback
  let aTarget = "76.76.21.21"; // fallback

  try {
    const configRes = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config?projectIdOrName=${projectId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 0 },
      }
    );

    if (configRes.ok) {
      const configData = await configRes.json();
      console.log("[vercel] GET domain config response:", JSON.stringify(configData, null, 2));

      // recommendedCNAME: [{ rank: "1", value: "abc123.vercel-dns-017.com" }]
      if (Array.isArray(configData.recommendedCNAME) && configData.recommendedCNAME.length > 0) {
        // Pick the highest priority (rank=1) or first entry
        const sorted = [...configData.recommendedCNAME].sort(
          (a: { rank: string }, b: { rank: string }) => Number(a.rank) - Number(b.rank)
        );
        cnameTarget = sorted[0].value;
      }

      // recommendedIPv4: [{ rank: "1", value: ["76.76.21.21"] }]
      if (Array.isArray(configData.recommendedIPv4) && configData.recommendedIPv4.length > 0) {
        const sorted = [...configData.recommendedIPv4].sort(
          (a: { rank: string }, b: { rank: string }) => Number(a.rank) - Number(b.rank)
        );
        const ipValue = sorted[0].value;
        if (Array.isArray(ipValue) && ipValue.length > 0) {
          aTarget = ipValue[0];
        } else if (typeof ipValue === "string") {
          aTarget = ipValue;
        }
      }
    } else {
      const errText = await configRes.text().catch(() => "");
      console.error("[vercel] GET domain config failed:", configRes.status, errText);
    }
  } catch (err) {
    console.error("[vercel] GET domain config error:", err);
  }

  // ── 3. Add the routing record with project-specific target ────
  if (isSubdomain) {
    records.push({
      type: "CNAME",
      name: recordName,
      value: cnameTarget,
    });
  } else {
    records.push({
      type: "A",
      name: "@",
      value: aTarget,
    });
  }

  return records;
}

/**
 * Parse DNS records from a Vercel "add domain" or "verify domain" response.
 * Call this right after POST /v10/projects/{id}/domains to capture
 * the verification records Vercel returns in the response body.
 *
 * NOTE: The POST response does NOT contain recommendedCNAME, so we still
 * need to call fetchVercelDnsRecords() afterwards for the routing record.
 * This function only extracts TXT verification records from the response.
 */
export function parseDnsRecordsFromVercelResponse(
  domain: string,
  data: Record<string, unknown>
): { type: string; name: string; value: string }[] {
  const records: { type: string; name: string; value: string }[] = [];

  // Extract TXT verification records — show only prefix, not full domain
  // Use Vercel's apexName to correctly determine the prefix
  const apex = (data.apexName as string) || domain;

  if (Array.isArray(data.verification)) {
    for (const v of data.verification as { type?: string; domain?: string; value?: string }[]) {
      const fullName = v.domain || `_vercel.${apex}`;
      records.push({
        type: v.type || "TXT",
        name: stripApex(fullName, apex),
        value: v.value || "",
      });
    }
  }

  return records;
}
