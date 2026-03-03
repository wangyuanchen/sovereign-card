import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sovereign Card — Web3 Identity Card",
  description:
    "Generate your on-chain identity card. Showcase your NFTs, tokens, and Web3 presence.",
  openGraph: {
    title: "Sovereign Card — Web3 Identity Card",
    description:
      "Generate your on-chain identity card. Showcase your NFTs, tokens, and Web3 presence.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sovereign Card",
    description: "Your Web3 Identity, One Card.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
