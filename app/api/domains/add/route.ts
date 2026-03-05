import { NextRequest, NextResponse } from "next/server";
import { getUserByWallet, addCustomDomain, getDomainsByUser } from "@/lib/db";
import {
  verifyWalletSignature,
  getDomainAuthMessage,
  MAX_DOMAINS_PER_USER,
} from "@/lib/auth";
import { fetchVercelDnsRecords, parseDnsRecordsFromVercelResponse } from "@/lib/vercel";

/**
 * POST /api/domains/add
 * Add a custom domain for a pro user
 * Body: { wallet_address: string, domain: string, signature: string }
 *
 * The caller must sign the message:
 *   getDomainAuthMessage("add", domain)
 * with the same wallet to prove ownership.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, domain, signature } = body;

    if (!wallet_address || !domain || !signature) {
      return NextResponse.json(
        { error: "Missing wallet_address, domain, or signature" },
        { status: 400 }
      );
    }

    // ── Validate domain format ────────────────────────────
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // ── Verify wallet signature ───────────────────────────
    const message = getDomainAuthMessage("add", domain);
    const isValid = await verifyWalletSignature(wallet_address, message, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature — wallet ownership not proven" },
        { status: 401 }
      );
    }

    // ── Check user exists and is Pro ──────────────────────
    const user = await getUserByWallet(wallet_address);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.is_pro) {
      return NextResponse.json(
        { error: "Custom domains require a Pro subscription" },
        { status: 403 }
      );
    }

    // ── Enforce domain count limit ────────────────────────
    const existingDomains = await getDomainsByUser(user.id);
    if (existingDomains.length >= MAX_DOMAINS_PER_USER) {
      return NextResponse.json(
        {
          error: `Domain limit reached. Pro users can add up to ${MAX_DOMAINS_PER_USER} domains.`,
        },
        { status: 403 }
      );
    }

    // ── Add domain to Vercel project ──────────────────────
    if (!process.env.SC_VERCEL_TOKEN || !process.env.SC_VERCEL_PROJECT_ID) {
      return NextResponse.json(
        { error: "Vercel API credentials not configured on server" },
        { status: 500 }
      );
    }

    let vercelData: Record<string, unknown> | null = null;

    try {
      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${process.env.SC_VERCEL_PROJECT_ID}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SC_VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        }
      );

      const resBody = await vercelRes.json().catch(() => null);

      if (!vercelRes.ok) {
        const errMsg = resBody?.error?.message || "Vercel rejected the domain";
        console.error("Vercel domain add error:", errMsg);
        return NextResponse.json(
          { error: `Failed to register domain with Vercel: ${errMsg}` },
          { status: 502 }
        );
      }

      // Capture response — it contains verification records
      vercelData = resBody;
      console.log("[domains/add] Vercel response:", JSON.stringify(vercelData, null, 2));
    } catch (err) {
      console.error("Vercel API error:", err);
      return NextResponse.json(
        { error: "Could not reach Vercel API" },
        { status: 502 }
      );
    }

    // ── Only save to DB after Vercel succeeds ─────────────
    const domainRecord = await addCustomDomain(user.id, domain);

    // ── Extract DNS records from Vercel response ──────────
    // Prefer records from the POST response (most accurate),
    // fall back to fetching from GET endpoint
    let dnsRecords: { type: string; name: string; value: string }[] = [];
    if (vercelData) {
      dnsRecords = parseDnsRecordsFromVercelResponse(domain, vercelData);
    }
    if (dnsRecords.length === 0) {
      try {
        dnsRecords = await fetchVercelDnsRecords(domain);
      } catch (err) {
        console.error("Failed to fetch DNS records:", err);
      }
    }

    return NextResponse.json({ domain: domainRecord, dnsRecords });
  } catch (error) {
    console.error("POST /api/domains/add error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
