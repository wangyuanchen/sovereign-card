/**
 * GoldRush (Covalent) API wrapper
 * Docs: https://goldrush.dev/docs/api
 */

const GOLDRUSH_BASE = "https://api.covalenthq.com/v1";

function getApiKey(): string {
  const key = process.env.GOLDRUSH_API_KEY;
  if (!key) throw new Error("GOLDRUSH_API_KEY environment variable is not set");
  return key;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

async function fetchGoldRush<T>(path: string): Promise<T> {
  const url = `${GOLDRUSH_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoldRush API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ─── Types ─────────────────────────────────────────────

export interface NFTItem {
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  token_id: string;
  external_data?: {
    name: string;
    description: string;
    image: string;
    image_256?: string;
    image_512?: string;
    image_1024?: string;
    animation_url?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  floor_price_quote?: number;
}

export interface NFTResponse {
  address: string;
  items: Array<{
    contract_name: string;
    contract_ticker_symbol: string;
    contract_address: string;
    nft_data: NFTItem[];
  }>;
}

export interface TokenBalance {
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  contract_decimals: number;
  logo_url: string;
  balance: string;
  quote: number;
  quote_rate: number;
  type: string;
}

export interface BalanceResponse {
  address: string;
  chain_id: number;
  chain_name: string;
  quote_currency: string;
  items: TokenBalance[];
}

export interface Transaction {
  block_signed_at: string;
  block_height: number;
  tx_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  value_quote: number;
  gas_quote: number;
  successful: boolean;
  log_events?: Array<{
    decoded?: {
      name: string;
      params: Array<{ name: string; value: string }>;
    };
  }>;
}

export interface TransactionResponse {
  address: string;
  items: Transaction[];
}

// ─── NFT Service ───────────────────────────────────────

export async function getNFTs(
  walletAddress: string,
  chainName: string = "eth-mainnet"
): Promise<NFTResponse> {
  return fetchGoldRush<NFTResponse>(
    `/${chainName}/address/${walletAddress}/balances_nft/?with-uncached=true&no-spam=true`
  );
}

// ─── Balance Service ───────────────────────────────────

export async function getTokenBalances(
  walletAddress: string,
  chainName: string = "eth-mainnet"
): Promise<BalanceResponse> {
  return fetchGoldRush<BalanceResponse>(
    `/${chainName}/address/${walletAddress}/balances_v2/?no-spam=true&no-nft-asset-metadata=true`
  );
}

// ─── Transaction Service ───────────────────────────────

export async function getTransactions(
  walletAddress: string,
  chainName: string = "eth-mainnet",
  pageSize: number = 20
): Promise<TransactionResponse> {
  return fetchGoldRush<TransactionResponse>(
    `/${chainName}/address/${walletAddress}/transactions_v3/page/0/?no-logs=true&page-size=${pageSize}`
  );
}

// ─── ENS Resolution ────────────────────────────────────

export async function resolveENS(
  walletAddress: string
): Promise<{ name: string | null; avatar: string | null }> {
  try {
    // Use GoldRush to get address metadata which may include ENS
    const data = await fetchGoldRush<{
      items: Array<{
        contract_ticker_symbol: string;
        nft_data?: Array<{
          external_data?: { name: string; image: string };
        }>;
      }>;
    }>(
      `/eth-mainnet/address/${walletAddress}/balances_nft/?with-uncached=false&no-spam=true`
    );

    // Try to find ENS name from public ENS API as fallback
    const ensRes = await fetch(
      `https://api.ensideas.com/ens/resolve/${walletAddress}`
    );
    if (ensRes.ok) {
      const ensData = await ensRes.json();
      return {
        name: ensData.name || null,
        avatar: ensData.avatar || null,
      };
    }

    return { name: null, avatar: null };
  } catch {
    return { name: null, avatar: null };
  }
}
