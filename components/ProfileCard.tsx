"use client";

import Image from "next/image";

interface ProfileCardProps {
  walletAddress: string;
  ensName?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  twitter?: string | null;
  github?: string | null;
  farcaster?: string | null;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProfileCard({
  walletAddress,
  ensName,
  displayName,
  bio,
  avatarUrl,
  twitter,
  github,
  farcaster,
}: ProfileCardProps) {
  const name = displayName || ensName || truncateAddress(walletAddress);
  const avatar =
    avatarUrl ||
    `https://api.dicebear.com/8.x/shapes/svg?seed=${walletAddress}`;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Gradient border effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan rounded-2xl opacity-50 blur-sm" />

      <div className="relative bg-bg-card rounded-2xl p-8 border border-border-subtle">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue to-accent-purple rounded-full opacity-60 blur-sm" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border-subtle">
              <Image
                src={avatar}
                alt={name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1">{name}</h1>

          {ensName && displayName && (
            <p className="text-sm text-accent-cyan font-mono">{ensName}</p>
          )}

          <button
            onClick={() => navigator.clipboard.writeText(walletAddress)}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full
              bg-bg-elevated border border-border-subtle
              hover:border-border-accent transition-colors
              text-xs font-mono text-text-secondary hover:text-text-primary"
            title="Copy address"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {truncateAddress(walletAddress)}
          </button>

          {bio && (
            <p className="mt-4 text-sm text-text-secondary max-w-xs leading-relaxed">
              {bio}
            </p>
          )}
        </div>

        {/* Social Links */}
        {(twitter || github || farcaster) && (
          <div className="flex justify-center gap-3 pt-4 border-t border-border-subtle">
            {twitter && (
              <a
                href={`https://twitter.com/${twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  bg-bg-elevated border border-border-subtle
                  hover:border-accent-blue/50 hover:text-accent-blue
                  transition-all text-sm text-text-secondary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @{twitter}
              </a>
            )}

            {github && (
              <a
                href={`https://github.com/${github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  bg-bg-elevated border border-border-subtle
                  hover:border-text-primary/50 hover:text-text-primary
                  transition-all text-sm text-text-secondary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {github}
              </a>
            )}

            {farcaster && (
              <a
                href={`https://warpcast.com/${farcaster}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  bg-bg-elevated border border-border-subtle
                  hover:border-accent-purple/50 hover:text-accent-purple
                  transition-all text-sm text-text-secondary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v18H3V3zm3.75 4.5v9h1.5v-4.125L11.625 16.5h.75l3.375-4.125V16.5h1.5v-9h-1.5l-3.75 4.875L8.25 7.5H6.75z" />
                </svg>
                {farcaster}
              </a>
            )}
          </div>
        )}

        {/* Watermark */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex justify-center">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            sovereign.card
          </span>
        </div>
      </div>
    </div>
  );
}
