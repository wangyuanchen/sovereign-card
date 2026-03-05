import { NextRequest, NextResponse } from "next/server";
import { verifyCustomDomain, getUserByWallet, getDomainsByUser } from "@/lib/db";
import { fetchVercelDnsRecords, parseDnsRecordsFromVercelResponse } from "@/lib/vercel";

/**
 * POST /api/domains/verify
 * Verify DNS configuration for a custom domain via Vercel API
 * Body: { domain: string, wallet_address: string }
 *
 * No signature required — domain ownership was already proven
 * when the user added the domain (which required a signature).
 * This endpoint just checks if DNS is configured correctly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, wallet_address } = body;

    if (!domain || !wallet_address) {
      return NextResponse.json(
        { error: "Missing domain or wallet_address" },
        { status: 400 }
      );
    }

    // ── Confirm domain belongs to this wallet ─────────────
    const user = await getUserByWallet(wallet_address);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDomains = await getDomainsByUser(user.id);
    const ownsThisDomain = userDomains.some(
      (d) => (d as Record<string, string>).domain?.toLowerCase() === domain.toLowerCase()
    );
    if (!ownsThisDomain) {
      return NextResponse.json(
        { error: "This domain does not belong to your account" },
        { status: 403 }
      );
    }

    if (!process.env.SC_VERCEL_TOKEN || !process.env.SC_VERCEL_PROJECT_ID) {
      return NextResponse.json(
        { error: "Vercel API credentials not configured" },
        { status: 500 }
      );
    }

    // ── Step 1: Ask Vercel to verify the domain's DNS ──────
    let dnsVerified = false;
    let vercelDomainId = domain;
    let vercelVerifyData: Record<string, unknown> | null = null;

    try {
      // First check current domain config on Vercel
      const configRes = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        {
          headers: { Authorization: `Bearer ${process.env.SC_VERCEL_TOKEN}` },
        }
      );

      if (configRes.ok) {
        const configData = await configRes.json();
        // If cnames point to Vercel, the misconfigured flag will be false
        dnsVerified = configData.misconfigured === false;
      }
    } catch {
      // Config check failed, try the verify endpoint below
    }

    if (!dnsVerified) {
      try {
        const verifyRes = await fetch(
          `https://api.vercel.com/v10/projects/${process.env.SC_VERCEL_PROJECT_ID}/domains/${domain}/verify`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SC_VERCEL_TOKEN}`,
            },
          }
        );

        if (verifyRes.ok) {
          const data = await verifyRes.json();
          dnsVerified = data.verified === true;
          vercelDomainId = data.name || domain;
          vercelVerifyData = data;
          console.log("[domains/verify] Vercel verify response:", JSON.stringify(data, null, 2));
        }
      } catch {
        // Vercel verify also failed
      }
    }

    if (!dnsVerified) {
      // Fetch complete DNS records (TXT verification + project-specific CNAME/A)
      let dnsRecords: { type: string; name: string; value: string }[] = [];
      try {
        dnsRecords = await fetchVercelDnsRecords(domain);
      } catch (err) {
        console.error("Failed to fetch DNS records:", err);
        // Fall back to just TXT records from the verify response
        if (vercelVerifyData) {
          dnsRecords = parseDnsRecordsFromVercelResponse(domain, vercelVerifyData);
        }
      }

      return NextResponse.json(
        {
          verified: false,
          error: "DNS not configured. Please set up the required DNS records shown below.",
          dnsRecords,
        },
        { status: 400 }
      );
    }

    // ── Step 2: Mark domain as verified in DB ──────────────
    const updated = await verifyCustomDomain(domain, vercelDomainId);
    if (!updated) {
      return NextResponse.json(
        { error: "Domain not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json({ verified: true, domain: updated });
  } catch (error) {
    console.error("POST /api/domains/verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
