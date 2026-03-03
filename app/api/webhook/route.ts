import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import Stripe from "stripe";

/**
 * POST /api/webhook
 * Stripe webhook endpoint — listens for checkout.session.completed
 * to permanently upgrade users to Pro after one-time payment.
 *
 * Configure in Stripe Dashboard → Webhooks:
 *   URL:    https://your-domain.com/api/webhook
 *   Events: checkout.session.completed
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // ── Verify Stripe signature ────────────────────────────
    if (stripeSecretKey && webhookSecret) {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2026-01-28.clover",
      });

      const body = await request.text();
      const signature = request.headers.get("stripe-signature");

      if (!signature) {
        return NextResponse.json(
          { error: "Missing stripe-signature header" },
          { status: 400 }
        );
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`⚠️ Webhook signature verification failed: ${message}`);
        return NextResponse.json(
          { error: "Webhook signature verification failed" },
          { status: 400 }
        );
      }

      // ── Handle event ──────────────────────────────────────
      return handleStripeEvent(event);
    }

    // ── Fallback: legacy mode (WEBHOOK_SECRET header auth) ──
    // Kept for backward compatibility / non-Stripe providers
    const legacySecret = process.env.WEBHOOK_SECRET;
    if (legacySecret) {
      const provided = request.headers.get("x-webhook-secret");
      if (provided !== legacySecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { event, wallet_address, payment_id } = body;

    if (!event || !wallet_address) {
      return NextResponse.json(
        { error: "Invalid payload — need event and wallet_address" },
        { status: 400 }
      );
    }

    if (event === "payment.success") {
      return upgradeUserToPro(wallet_address, payment_id);
    }

    return NextResponse.json({ success: true, acknowledged: true });
  } catch (error) {
    console.error("POST /api/webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Stripe event handler ─────────────────────────────────

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // wallet_address was passed as metadata when creating the session
      const walletAddress = session.metadata?.wallet_address;

      if (!walletAddress) {
        console.error(
          "checkout.session.completed: no wallet_address in metadata"
        );
        return NextResponse.json(
          { error: "No wallet_address in session metadata" },
          { status: 400 }
        );
      }

      // Only process completed payments
      if (session.payment_status !== "paid") {
        console.warn(
          `checkout.session.completed but payment_status=${session.payment_status}`
        );
        return NextResponse.json({ success: true, acknowledged: true });
      }

      return upgradeUserToPro(walletAddress, session.id);
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
      return NextResponse.json({ success: true, acknowledged: true });
  }
}

// ── Shared upgrade logic ──────────────────────────────────

async function upgradeUserToPro(walletAddress: string, paymentRef?: string) {
  const sql = getDb();

  const rows = await sql`
    UPDATE users
    SET is_pro = TRUE
    WHERE wallet_address = ${walletAddress.toLowerCase()}
    RETURNING id, wallet_address, is_pro
  `;

  if (rows.length === 0) {
    console.warn(`Webhook: user not found for wallet ${walletAddress}`);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  console.log(
    `✅ User ${walletAddress} upgraded to Pro (ref: ${paymentRef ?? "n/a"})`
  );
  return NextResponse.json({ success: true, user: rows[0] });
}
