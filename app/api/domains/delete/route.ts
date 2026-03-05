import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWallet,
  getDomainsByUser,
  deleteCustomDomain,
} from "@/lib/db";
import { verifyWalletSignature, getDomainAuthMessage } from "@/lib/auth";

/**
 * POST /api/domains/delete
 * Delete a custom domain from the user's account and Vercel project.
 * Body: { wallet_address: string, domain: string, signature: string }
 *
 * Requires wallet signature to prove the caller owns the account.
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

    // ── Verify wallet signature ───────────────────────────
    const message = getDomainAuthMessage("delete", domain);
    const valid = await verifyWalletSignature(wallet_address, message, signature);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // ── Check user exists and owns this domain ────────────
    const user = await getUserByWallet(wallet_address);
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

    // ── Remove domain from Vercel project ─────────────────
    if (process.env.SC_VERCEL_TOKEN && process.env.SC_VERCEL_PROJECT_ID) {
      try {
        const vercelRes = await fetch(
          `https://api.vercel.com/v9/projects/${process.env.SC_VERCEL_PROJECT_ID}/domains/${domain}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.SC_VERCEL_TOKEN}`,
            },
          }
        );

        if (!vercelRes.ok) {
          const errData = await vercelRes.json().catch(() => null);
          console.error(
            "Vercel domain delete error:",
            errData?.error?.message || vercelRes.status
          );
          // Continue to delete from DB even if Vercel removal fails
          // (domain may have already been removed from Vercel)
        }
      } catch (err) {
        console.error("Vercel API error during domain delete:", err);
      }
    }

    // ── Remove domain from database ───────────────────────
    const deleted = await deleteCustomDomain(user.id, domain);
    if (!deleted) {
      return NextResponse.json(
        { error: "Domain not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${domain} has been removed`,
    });
  } catch (error) {
    console.error("POST /api/domains/delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
