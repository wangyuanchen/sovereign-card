import { getUserByDomain } from "@/lib/db";
import { getProfileData } from "@/lib/cache";
import { resolveENS } from "@/lib/goldrush";
import ProfileCard from "@/components/ProfileCard";
import NFTGallery from "@/components/NFTGallery";
import TokenList from "@/components/TokenList";
import ActivityFeed from "@/components/ActivityFeed";
import { notFound } from "next/navigation";

/**
 * ISR: Revalidate custom-domain pages every 60 seconds
 * so we don't hit the DB on every single request.
 */
export const revalidate = 60;

interface Props {
  params: { path: string[] };
}

/**
 * Custom domain handler
 * Renders the profile page for the user associated with the custom domain
 */
export default async function CustomDomainPage({ params }: Props) {
  const [hostname, ...rest] = params.path;

  // Look up user by domain
  const user = await getUserByDomain(hostname).catch(() => null);
  if (!user) {
    notFound();
  }

  const wallet = user.wallet_address;

  // Fetch profile data
  const [profileData, ensData] = await Promise.all([
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
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px]" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Profile Card */}
        <section className="mb-12">
          <ProfileCard
            walletAddress={wallet}
            ensName={user.ens_name || ensData.name}
            displayName={user.display_name}
            bio={user.bio}
            avatarUrl={user.avatar_url || ensData.avatar}
            twitter={user.twitter}
            github={user.github}
            farcaster={user.farcaster}
          />
        </section>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card-section lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              NFT Collection
            </h2>
            <NFTGallery nfts={profileData.nfts as any} />
          </section>

          <section className="card-section">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Token Holdings
            </h2>
            <TokenList tokens={profileData.tokens as any} />
          </section>

          <section className="card-section">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Recent Activity
            </h2>
            <ActivityFeed transactions={profileData.transactions as any} currentWallet={wallet} />
          </section>
        </div>

        {/* Powered by */}
        <div className="flex justify-center mt-12">
          <a
            href="https://sovereign-card.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-muted flex items-center gap-1 hover:text-text-secondary transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Powered by Sovereign Card
          </a>
        </div>
      </div>
    </main>
  );
}
