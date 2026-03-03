import { NextRequest, NextResponse } from "next/server";
import { verifyCustomDomain } from "@/lib/db";

/**
 * POST /api/domains/verify
 * Verify DNS configuration for a custom domain via Vercel API
 * Body: { domain: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID) {
      return NextResponse.json(
        { error: "Vercel API credentials not configured" },
        { status: 500 }
      );
    }

    // ── Step 1: Ask Vercel to verify the domain's DNS ──────
    let dnsVerified = false;
    let vercelDomainId = domain;

    try {
      // First check current domain config on Vercel
      const configRes = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        {
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
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
          `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}/verify`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
            },
          }
        );

        if (verifyRes.ok) {
          const data = await verifyRes.json();
          dnsVerified = data.verified === true;
          vercelDomainId = data.name || domain;
        }
      } catch {
        // Vercel verify also failed
      }
    }

    if (!dnsVerified) {
      return NextResponse.json(
        {
          verified: false,
          error:
            "DNS not configured. Add a CNAME record pointing to cname.vercel-dns.com",
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
