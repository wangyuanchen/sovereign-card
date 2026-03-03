"use client";

import Image from "next/image";

interface TokenData {
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  logo_url: string;
  balance: string;
  contract_decimals: number;
  quote: number;
  quote_rate: number;
  type: string;
}

interface TokenListProps {
  tokens: { items?: TokenData[] } | null;
}

function formatBalance(balance: string, decimals: number): string {
  const num = Number(balance) / Math.pow(10, decimals);
  if (num === 0) return "0";
  if (num < 0.001) return "<0.001";
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(3);
  if (num < 1_000_000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1_000_000).toFixed(2)}M`;
}

function formatUSD(value: number): string {
  if (value === 0 || !value) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TokenList({ tokens }: TokenListProps) {
  if (!tokens?.items?.length) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No tokens found</p>
      </div>
    );
  }

  // Filter out dust and sort by value
  const sortedTokens = tokens.items
    .filter((t) => t.quote > 0.01 || t.type === "cryptocurrency")
    .sort((a, b) => (b.quote || 0) - (a.quote || 0));

  const totalValue = sortedTokens.reduce((sum, t) => sum + (t.quote || 0), 0);

  return (
    <div>
      {/* Total Portfolio Value */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
        <span className="text-sm text-text-secondary">Total Value</span>
        <span className="text-lg font-bold bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">
          {formatUSD(totalValue)}
        </span>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {sortedTokens.slice(0, 15).map((token, idx) => (
          <div
            key={`${token.contract_address}-${idx}`}
            className="flex items-center gap-3 p-3 rounded-xl
              bg-bg-elevated/50 border border-transparent
              hover:border-border-subtle transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-bg-elevated flex-shrink-0">
              {token.logo_url ? (
                <Image
                  src={token.logo_url}
                  alt={token.contract_ticker_symbol}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
                  {token.contract_ticker_symbol?.charAt(0) || "?"}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary truncate">
                  {token.contract_ticker_symbol}
                </span>
                <span className="text-sm font-medium text-text-primary ml-2">
                  {formatUSD(token.quote)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted truncate">
                  {token.contract_name}
                </span>
                <span className="text-xs text-text-muted ml-2">
                  {formatBalance(token.balance, token.contract_decimals)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedTokens.length > 15 && (
        <p className="text-center text-xs text-text-muted mt-3">
          +{sortedTokens.length - 15} more tokens
        </p>
      )}
    </div>
  );
}
