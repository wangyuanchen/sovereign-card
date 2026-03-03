import { verifyMessage } from "viem";

/**
 * Maximum number of custom domains a Pro user can add
 */
export const MAX_DOMAINS_PER_USER = 3;

/**
 * Generate a deterministic auth message for domain operations.
 * Both client and server construct the same string for signature verification.
 */
export function getDomainAuthMessage(
  action: "add" | "verify",
  domain: string
): string {
  return `Sovereign Card: I authorize "${action}" for domain "${domain}"`;
}

/**
 * Verify that a message was signed by the claimed wallet address.
 * Uses viem's verifyMessage under the hood (EIP-191 personal_sign).
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}
