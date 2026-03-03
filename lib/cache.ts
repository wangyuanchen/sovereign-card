import { getCachedProfile, setCachedProfile } from "./db";
import { getNFTs, getTokenBalances, getTransactions } from "./goldrush";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface CachedProfileData {
  nfts: unknown;
  tokens: unknown;
  transactions: unknown;
  fromCache: boolean;
}

/**
 * Get on-chain profile data with 30-minute cache
 * First checks DB cache, falls back to GoldRush API
 */
export async function getProfileData(
  walletAddress: string,
  chainName: string = "eth-mainnet"
): Promise<CachedProfileData> {
  // 1. Try cache first
  const cached = await getCachedProfile(walletAddress);
  if (cached) {
    return {
      nfts: cached.nfts,
      tokens: cached.tokens,
      transactions: cached.transactions,
      fromCache: true,
    };
  }

  // 2. Fetch fresh data from GoldRush
  const [nftsResult, tokensResult, txResult] = await Promise.allSettled([
    getNFTs(walletAddress, chainName),
    getTokenBalances(walletAddress, chainName),
    getTransactions(walletAddress, chainName),
  ]);

  const nfts = nftsResult.status === "fulfilled" ? nftsResult.value : null;
  const tokens = tokensResult.status === "fulfilled" ? tokensResult.value : null;
  const transactions = txResult.status === "fulfilled" ? txResult.value : null;

  // 3. Store in cache
  try {
    await setCachedProfile(walletAddress, { nfts, tokens, transactions });
  } catch (err) {
    console.error("Failed to cache profile data:", err);
  }

  return { nfts, tokens, transactions, fromCache: false };
}

/**
 * Force refresh cache for a wallet
 */
export async function refreshProfileCache(
  walletAddress: string,
  chainName: string = "eth-mainnet"
): Promise<CachedProfileData> {
  const [nftsResult, tokensResult, txResult] = await Promise.allSettled([
    getNFTs(walletAddress, chainName),
    getTokenBalances(walletAddress, chainName),
    getTransactions(walletAddress, chainName),
  ]);

  const nfts = nftsResult.status === "fulfilled" ? nftsResult.value : null;
  const tokens = tokensResult.status === "fulfilled" ? tokensResult.value : null;
  const transactions = txResult.status === "fulfilled" ? txResult.value : null;

  await setCachedProfile(walletAddress, { nfts, tokens, transactions });

  return { nfts, tokens, transactions, fromCache: false };
}
