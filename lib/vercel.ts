/**
 * Fetch DNS records a user must configure from Vercel APIs.
 *
 * Uses two Vercel endpoints:
 *   1. GET /v9/projects/{id}/domains/{domain}
 *      → Returns `verification[]` with TXT records needed for domain ownership proof
 *      → Also returns `verified` status
 *
 *   2. GET /v6/domains/{domain}/config
 *      → Returns `misconfigured` (whether DNS is pointing to Vercel)
 *      → `cnames` array contains what DNS currently resolves to (NOT the intended target)
 *
 * For the CNAME target we always use `cname.vercel-dns.com` (universal Vercel alias).
 * Vercel Dashboard may show a project-specific hostname like `abc123.vercel-dns-017.com`,
 * but `cname.vercel-dns.com` resolves to the same infrastructure and is officially supported.
 */
export async function fetchVercelDnsRecords(
  domain: string
): Promise<{ type: string; name: string; value: string }[]> {
  const records: { type: string; name: string; value: string }[] = [];
  const token = process.env.SC_VERCEL_TOKEN!;
  const projectId = process.env.SC_VERCEL_PROJECT_ID!;

  const parts = domain.split(".");
  const isSubdomain = parts.length > 2;
  const recordName = isSubdomain ? parts.slice(0, parts.length - 2).join(".") : "@";

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

      // Extract TXT verification records
      if (Array.isArray(data.verification)) {
        for (const v of data.verification) {
          records.push({
            type: v.type || "TXT",
            name: v.domain || `_vercel.${data.apexName || domain}`,
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

  // ── 2. Always add the CNAME / A record for routing ────────────
  // This tells the user how to point their domain to Vercel.
  // cname.vercel-dns.com is the universal CNAME alias for all Vercel projects.
  if (isSubdomain) {
    records.push({
      type: "CNAME",
      name: recordName,
      value: "cname.vercel-dns.com",
    });
  } else {
    // Apex domain → A record to Vercel's anycast IP
    records.push({
      type: "A",
      name: "@",
      value: "76.76.21.21",
    });
  }

  return records;
}

/**
 * Parse DNS records from a Vercel "add domain" or "verify domain" response.
 * Call this right after POST /v10/projects/{id}/domains to capture
 * the verification records Vercel returns in the response body.
 */
export function parseDnsRecordsFromVercelResponse(
  domain: string,
  data: Record<string, unknown>
): { type: string; name: string; value: string }[] {
  const records: { type: string; name: string; value: string }[] = [];

  const parts = domain.split(".");
  const isSubdomain = parts.length > 2;
  const recordName = isSubdomain ? parts.slice(0, parts.length - 2).join(".") : "@";

  // Extract TXT verification records from response
  if (Array.isArray(data.verification)) {
    for (const v of data.verification as { type?: string; domain?: string; value?: string }[]) {
      records.push({
        type: v.type || "TXT",
        name: v.domain || `_vercel.${(data.apexName as string) || domain}`,
        value: v.value || "",
      });
    }
  }

  // Add routing record (CNAME for subdomain, A for apex)
  if (isSubdomain) {
    records.push({
      type: "CNAME",
      name: recordName,
      value: "cname.vercel-dns.com",
    });
  } else {
    records.push({
      type: "A",
      name: "@",
      value: "76.76.21.21",
    });
  }

  return records;
}
