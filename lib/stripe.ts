import Stripe from "stripe";

/**
 * Singleton Stripe instance.
 * Requires STRIPE_SECRET_KEY to be set.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your .env.local file."
    );
  }
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
