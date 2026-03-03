"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected && address) {
      // Register user in database on connect
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      }).catch(console.error);
    }
  }, [isConnected, address]);

  return (
    <div className="flex flex-col items-center gap-4">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="group relative px-8 py-4 rounded-xl font-semibold text-white
                        bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan
                        hover:shadow-lg hover:shadow-accent-purple/25
                        transition-all duration-300 ease-out
                        hover:scale-105 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Connect Wallet
                      </span>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="px-6 py-3 rounded-xl font-medium text-red-400
                        border border-red-500/30 bg-red-500/10
                        hover:bg-red-500/20 transition-colors"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openChainModal}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-bg-elevated border border-border-subtle
                        hover:border-border-accent transition-colors text-sm"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? "Chain"}
                          src={chain.iconUrl}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-bg-elevated border border-border-subtle
                        hover:border-accent-purple/50 transition-colors text-sm font-mono"
                    >
                      {account.displayName}
                      {account.displayBalance && (
                        <span className="text-text-secondary">
                          ({account.displayBalance})
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {isConnected && address && (
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.push(`/profile/${address}`)}
            className="px-5 py-2 rounded-lg text-sm font-medium
              bg-bg-elevated border border-border-subtle
              hover:border-accent-blue/50 hover:text-accent-blue
              transition-all"
          >
            View Card
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="px-5 py-2 rounded-lg text-sm font-medium
              bg-bg-elevated border border-border-subtle
              hover:border-accent-purple/50 hover:text-accent-purple
              transition-all"
          >
            Settings
          </button>
        </div>
      )}
    </div>
  );
}
