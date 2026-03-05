import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getUserByWallet, isDatabaseConfigured } from "@/lib/db";

/**
 * POST /api/checkout
 * Create a Stripe Checkout Session for one-time Pro upgrade.
 *
 * Body: { wallet_address: string }
 * Returns: { url: string } — redirect the user to this Stripe Checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server", errorCode: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Database not configured", errorCode: "DB_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: "wallet_address is required", errorCode: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByWallet(wallet_address);
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Visit your profile first to register.", errorCode: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Already Pro — no need to pay again
    if (user.is_pro) {
      return NextResponse.json(
        { error: "You are already a Pro user!", errorCode: "ALREADY_PRO" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID not configured on server", errorCode: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // Determine base URL for redirects
    const origin =
      request.headers.get("origin") ||
      (process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://localhost:3000");

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-time payment, not subscription
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        wallet_address: wallet_address.toLowerCase(),
      },
      success_url: `${origin}/settings?upgraded=true`,
      cancel_url: `${origin}/settings?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session", errorCode: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
