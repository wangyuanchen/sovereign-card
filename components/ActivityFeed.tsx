"use client";

import { useTranslations } from "next-intl";

interface TransactionData {
  block_signed_at: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  value_quote: number;
  gas_quote: number;
  successful: boolean;
}

interface ActivityFeedProps {
  transactions: { items?: TransactionData[] } | null;
  currentWallet: string;
}

function truncateAddress(address: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatETH(value: string): string {
  const eth = Number(value) / 1e18;
  if (eth === 0) return "0 ETH";
  if (eth < 0.001) return "<0.001 ETH";
  return `${eth.toFixed(4)} ETH`;
}

export default function ActivityFeed({ transactions, currentWallet }: ActivityFeedProps) {
  const t = useTranslations("profile");

  if (!transactions?.items?.length) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <p className="text-sm">{t("noActivity")}</p>
      </div>
    );
  }

  const wallet = currentWallet.toLowerCase();

  return (
    <div className="space-y-2">
      {transactions.items.slice(0, 10).map((tx, idx) => {
        const isSent = tx.from_address?.toLowerCase() === wallet;
        const isContract = !tx.to_address;

        return (
          <a
            key={`${tx.tx_hash}-${idx}`}
            href={`https://etherscan.io/tx/${tx.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl
              bg-bg-elevated/50 border border-transparent
              hover:border-border-subtle transition-all group"
          >
            {/* Direction Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isContract
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : isSent
                  ? "bg-red-500/10 text-red-400"
                  : "bg-green-500/10 text-green-400"
              }`}
            >
              {isContract ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              ) : isSent ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {isContract ? t("contractCall") : isSent ? t("sent") : t("received")}
                </span>
                <span className={`text-sm font-medium ${
                  isSent ? "text-red-400" : "text-green-400"
                }`}>
                  {isSent ? "-" : "+"}
                  {formatETH(tx.value)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-mono">
                  {isSent
                    ? `→ ${truncateAddress(tx.to_address || "")}`
                    : `← ${truncateAddress(tx.from_address)}`}
                </span>
                <span className="text-xs text-text-muted">
                  {formatTimeAgo(tx.block_signed_at)}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex-shrink-0">
              {tx.successful ? (
                <div className="w-2 h-2 rounded-full bg-green-400" title="Success" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-400" title="Failed" />
              )}
            </div>
          </a>
        );
      })}

      {transactions.items.length > 10 && (
        <p className="text-center text-xs text-text-muted mt-3">
          {t("showingLatest", { count: transactions.items.length })}
        </p>
      )}
    </div>
  );
}
