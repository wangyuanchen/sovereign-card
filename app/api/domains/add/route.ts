import { NextRequest, NextResponse } from "next/server";
import { getUserByWallet, addCustomDomain } from "@/lib/db";

/**
 * POST /api/domains/add
 * Add a custom domain for a pro user
 * Body: { wallet_address: string, domain: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, domain } = body;

    if (!wallet_address || !domain) {
      return NextResponse.json(
        { error: "Missing wallet_address or domain" },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Check user exists and is pro
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

    // Add domain to Vercel project
    let vercelDomainId: string | undefined;
    if (process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) {
      try {
        const vercelRes = await fetch(
          `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: domain }),
          }
        );

        if (vercelRes.ok) {
          const vercelData = await vercelRes.json();
          vercelDomainId = vercelData.name;
        } else {
          const errText = await vercelRes.text();
          console.error("Vercel domain add error:", errText);
        }
      } catch (err) {
        console.error("Vercel API error:", err);
      }
    }

    // Save to database
    const domainRecord = await addCustomDomain(user.id, domain);
    return NextResponse.json({ domain: domainRecord });
  } catch (error) {
    console.error("POST /api/domains/add error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
