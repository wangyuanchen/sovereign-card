import { notFound } from "next/navigation";
import { getUserByWallet } from "@/lib/db";
import { getProfileData } from "@/lib/cache";
import { resolveENS } from "@/lib/goldrush";
import ProfileCard from "@/components/ProfileCard";
import NFTGallery from "@/components/NFTGallery";
import TokenList from "@/components/TokenList";
import ActivityFeed from "@/components/ActivityFeed";
import type { Metadata } from "next";

interface Props {
  params: { wallet: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = params;
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);
  if (!isValidAddress) return { title: "Invalid Address" };

  const user = await getUserByWallet(wallet).catch(() => null);
  const name = user?.display_name || user?.ens_name || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  return {
    title: `${name} — Sovereign Card`,
    description: user?.bio || `Web3 identity card for ${name}`,
    openGraph: {
      title: `${name} — Sovereign Card`,
      description: user?.bio || `Web3 identity card for ${name}`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Sovereign Card`,
      description: user?.bio || `Web3 identity card for ${name}`,
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { wallet } = params;

  // Validate Ethereum address
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);
  if (!isValidAddress) {
    notFound();
  }

  // Fetch data in parallel
  const [user, profileData, ensData] = await Promise.all([
    getUserByWallet(wallet).catch(() => null),
    getProfileData(wallet).catch(() => ({
      nfts: null,
      tokens: null,
      transactions: null,
      fromCache: false,
    })),
    resolveENS(wallet).catch(() => ({ name: null, avatar: null })),
  ]);

  return (
    <main className="min-h-screen bg-bg-primary bg-grid">
      {/* Background effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px]" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-12">
          <a href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">Home</span>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue via-accent-purple to-accent-cyan flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Sovereign Card</span>
          </div>
        </nav>

        {/* Profile Card */}
        <section className="mb-12">
          <ProfileCard
            walletAddress={wallet}
            ensName={user?.ens_name || ensData.name}
            displayName={user?.display_name}
            bio={user?.bio}
            avatarUrl={user?.avatar_url || ensData.avatar}
            twitter={user?.twitter}
            github={user?.github}
            farcaster={user?.farcaster}
          />
        </section>

        {/* Cache indicator */}
        {profileData.fromCache && (
          <div className="flex justify-center mb-6">
            <span className="text-xs text-text-muted flex items-center gap-1 px-3 py-1 rounded-full bg-bg-elevated border border-border-subtle">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cached data — refreshes every 30 min
            </span>
          </div>
        )}

        {/* Tabs Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NFTs Section */}
          <section className="card-section lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold">NFT Collection</h2>
            </div>
            <NFTGallery nfts={profileData.nfts as any} />
          </section>

          {/* Tokens Section */}
          <section className="card-section">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold">Token Holdings</h2>
            </div>
            <TokenList tokens={profileData.tokens as any} />
          </section>

          {/* Activity Section */}
          <section className="card-section">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <ActivityFeed transactions={profileData.transactions as any} currentWallet={wallet} />
          </section>
        </div>

        {/* Share Button */}
        <div className="flex justify-center mt-8">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-cyan/10
              border border-border-subtle hover:border-accent-purple/30
              text-sm font-medium text-text-secondary hover:text-text-primary
              transition-all"
            onClick={() => {
              if (typeof navigator !== "undefined") {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Card
          </button>
        </div>
      </div>
    </main>
  );
}
