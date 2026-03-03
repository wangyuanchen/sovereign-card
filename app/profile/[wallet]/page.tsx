import { notFound } from "next/navigation";
import { getUserByWallet } from "@/lib/db";
import { getProfileData } from "@/lib/cache";
import { resolveENS } from "@/lib/goldrush";
import ProfileContent from "@/components/ProfileContent";
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
    <ProfileContent
      wallet={wallet}
      user={user}
      ensData={ensData}
      profileData={profileData}
    />
  );
}
