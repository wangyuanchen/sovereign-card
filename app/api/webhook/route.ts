import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db";

/**
 * POST /api/webhook
 * Receive one-time payment callback from your payment provider.
 * On success → permanently upgrades the user to Pro.
 *
 * Expected JSON body:
 *   { event: "payment.success" | "payment.failed", wallet_address: string, payment_id?: string }
 *
 * Security: Verify the request with WEBHOOK_SECRET header.
 * In production, replace this with your payment provider's signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth: verify webhook secret ────────────────────────
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const provided = request.headers.get("x-webhook-secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { event, wallet_address, payment_id } = body;

    if (!event || !wallet_address) {
      return NextResponse.json(
        { error: "Invalid webhook payload — need event and wallet_address" },
        { status: 400 }
      );
    }

    const sql = getDb();

    switch (event) {
      // ── One-time payment succeeded → permanent Pro ──────
      case "payment.success": {
        const rows = await sql`
          UPDATE users
          SET is_pro = TRUE
          WHERE wallet_address = ${wallet_address.toLowerCase()}
          RETURNING id, wallet_address, is_pro
        `;

        if (rows.length === 0) {
          console.warn(`Webhook: user not found for wallet ${wallet_address}`);
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        console.log(
          `✅ User ${wallet_address} upgraded to Pro (payment: ${payment_id})`
        );
        return NextResponse.json({ success: true, user: rows[0] });
      }

      // ── Payment failed → log and acknowledge ────────────
      case "payment.failed": {
        console.warn(
          `❌ Payment failed for ${wallet_address} (payment: ${payment_id})`
        );
        return NextResponse.json({ success: true, acknowledged: true });
      }

      default:
        console.warn(`Unhandled webhook event: ${event}`);
        return NextResponse.json({ success: true, acknowledged: true });
    }
  } catch (error) {
    console.error("POST /api/webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
