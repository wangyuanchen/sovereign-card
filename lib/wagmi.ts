"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";

// Use a placeholder during build if the env var isn't set
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder_project_id";

export const config = getDefaultConfig({
  appName: "Sovereign Card",
  projectId,
  chains: [mainnet, polygon, arbitrum, optimism, base],
  ssr: true,
});
