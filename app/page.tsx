import ConnectWallet from "@/components/ConnectWallet";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-grid relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-blue/10 rounded-full blur-[120px] -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-cyan/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue via-accent-purple to-accent-cyan flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Sovereign Card</h2>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
          Your{" "}
          <span className="text-gradient">Web3 Identity</span>
          <br />
          One Card.
        </h1>

        <p className="text-lg text-text-secondary mb-12 max-w-md mx-auto leading-relaxed">
          Connect your wallet to generate a shareable identity card showcasing
          your on-chain presence — NFTs, tokens, and activity.
        </p>

        {/* Wallet Connect */}
        <ConnectWallet />

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="card-section group hover:border-accent-blue/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-3
              group-hover:bg-accent-blue/20 transition-colors">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">NFT Showcase</h3>
            <p className="text-sm text-text-muted">
              Display your curated NFT collection in a beautiful grid.
            </p>
          </div>

          <div className="card-section group hover:border-accent-purple/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center mb-3
              group-hover:bg-accent-purple/20 transition-colors">
              <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Token Portfolio</h3>
            <p className="text-sm text-text-muted">
              Show your token holdings with real-time valuations.
            </p>
          </div>

          <div className="card-section group hover:border-accent-cyan/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 flex items-center justify-center mb-3
              group-hover:bg-accent-cyan/20 transition-colors">
              <svg className="w-5 h-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1">Custom Domain</h3>
            <p className="text-sm text-text-muted">
              Link your own domain for a truly sovereign identity.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-20 text-center text-xs text-text-muted">
        <p>Built with Next.js, GoldRush, and wagmi</p>
      </footer>
    </main>
  );
}
