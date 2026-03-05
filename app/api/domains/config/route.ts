import { NextRequest, NextResponse } from "next/server";
import { getUserByWallet, getDomainsByUser } from "@/lib/db";
import { fetchVercelDnsRecords } from "@/lib/vercel";

/**
 * GET /api/domains/config?domain=xxx&wallet=xxx
 * Fetch DNS configuration records from Vercel API for a domain.
 * Returns the exact CNAME / TXT records the user needs to set up.
 */
export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get("domain");
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!domain || !wallet) {
      return NextResponse.json(
        { error: "Missing domain or wallet parameter" },
        { status: 400 }
      );
    }

    // ── Verify the domain belongs to this wallet ──────────
    const user = await getUserByWallet(wallet);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDomains = await getDomainsByUser(user.id);
    const ownsThisDomain = userDomains.some(
      (d) =>
        (d as Record<string, string>).domain?.toLowerCase() ===
        domain.toLowerCase()
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

    const dnsRecords = await fetchVercelDnsRecords(domain);

    return NextResponse.json({ domain, dnsRecords });
  } catch (error) {
    console.error("GET /api/domains/config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
