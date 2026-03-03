"use client";

import { useAccount, useSignMessage } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ConnectWallet from "@/components/ConnectWallet";

interface UserProfile {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  twitter?: string;
  github?: string;
  farcaster?: string;
  is_pro?: boolean;
}

interface DomainEntry {
  id: string;
  domain: string;
  verified: boolean;
}

// Wrapper with Suspense boundary for useSearchParams
export default function SettingsPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-grid">
          <div className="text-text-secondary">Loading settings...</div>
        </main>
      }
    >
      <SettingsPage />
    </Suspense>
  );
}

function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Construct the same deterministic message that the server expects.
   * Must match lib/auth.ts → getDomainAuthMessage()
   */
  const getDomainAuthMessage = (action: "add" | "verify", domain: string) =>
    `Sovereign Card: I authorize "${action}" for domain "${domain}"`;

  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Upgrade / checkout state
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Domain management
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState("");

  // Detect ?upgraded=true from Stripe redirect
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      setUpgradeSuccess(true);
      // Refresh profile to get updated is_pro
      if (address) {
        fetch(`/api/profile?wallet=${address}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.user) {
              setProfile(data.user);
              setDomains(data.domains || []);
            }
          })
          .catch(console.error);
      }
    }
  }, [searchParams, address]);

  // Load profile on mount
  useEffect(() => {
    if (!isConnected || !address) return;

    fetch(`/api/profile?wallet=${address}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setDomains(data.domains || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  const handleSave = async () => {
    if (!address) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          ...profile,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain || !address) return;
    setDomainLoading(true);
    setDomainError("");

    try {
      // Sign a message to prove wallet ownership
      const message = getDomainAuthMessage("add", newDomain);
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          domain: newDomain,
          signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to add domain");
      } else {
        setDomains((prev) => [...prev, data.domain]);
        setNewDomain("");
      }
    } catch {
      setDomainError("Network error");
    } finally {
      setDomainLoading(false);
    }
  };

  const handleVerifyDomain = async (domain: string) => {
    if (!address) return;
    try {
      // Sign a message to prove wallet ownership
      const message = getDomainAuthMessage("verify", domain);
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, wallet_address: address, signature }),
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        setDomains((prev) =>
          prev.map((d) => (d.domain === domain ? { ...d, verified: true } : d))
        );
      } else {
        alert(data.error || "DNS verification failed. Make sure your CNAME is set up.");
      }
    } catch {
      alert("Verification failed");
    }
  };

  const handleUpgrade = async () => {
    if (!address) return;
    setUpgrading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to start checkout");
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setUpgrading(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-grid">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-text-secondary">Connect your wallet to access settings</p>
        </div>
        <ConnectWallet />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-grid">
        <div className="flex items-center gap-3 text-text-secondary">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-primary bg-grid">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px]" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-12">
          <a href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">Home</span>
          </a>
          {address && (
            <button
              onClick={() => router.push(`/profile/${address}`)}
              className="text-sm text-accent-purple hover:text-accent-blue transition-colors"
            >
              View My Card →
            </button>
          )}
        </nav>

        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Upgrade Success Banner */}
        {upgradeSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-400">🎉 Welcome to Pro!</p>
              <p className="text-xs text-green-400/70">Your payment was successful. Custom domains are now unlocked.</p>
            </div>
            <button
              onClick={() => setUpgradeSuccess(false)}
              className="ml-auto text-green-400/50 hover:text-green-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Profile Section */}
        <section className="card-section mb-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Display Name</label>
              <input
                type="text"
                value={profile.display_name || ""}
                onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="vitalik.eth"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-subtle
                  focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                  text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Bio</label>
              <textarea
                value={profile.bio || ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Building the future of web3..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-subtle
                  focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                  text-text-primary placeholder:text-text-muted transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Avatar URL</label>
              <input
                type="url"
                value={profile.avatar_url || ""}
                onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-subtle
                  focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                  text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Social Links Section */}
        <section className="card-section mb-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Social Links
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Twitter / X</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-bg-primary border border-r-0 border-border-subtle text-sm text-text-muted">@</span>
                <input
                  type="text"
                  value={profile.twitter || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, twitter: e.target.value }))}
                  placeholder="username"
                  className="flex-1 px-4 py-2.5 rounded-r-xl bg-bg-elevated border border-border-subtle
                    focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                    text-text-primary placeholder:text-text-muted transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">GitHub</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-bg-primary border border-r-0 border-border-subtle text-sm text-text-muted">github.com/</span>
                <input
                  type="text"
                  value={profile.github || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
                  placeholder="username"
                  className="flex-1 px-4 py-2.5 rounded-r-xl bg-bg-elevated border border-border-subtle
                    focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                    text-text-primary placeholder:text-text-muted transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Farcaster</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-bg-primary border border-r-0 border-border-subtle text-sm text-text-muted">@</span>
                <input
                  type="text"
                  value={profile.farcaster || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, farcaster: e.target.value }))}
                  placeholder="username"
                  className="flex-1 px-4 py-2.5 rounded-r-xl bg-bg-elevated border border-border-subtle
                    focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                    text-text-primary placeholder:text-text-muted transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-xl font-semibold text-white
              bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan
              hover:shadow-lg hover:shadow-accent-purple/25
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>

        {/* Custom Domains Section (Pro Only) */}
        <section className="card-section">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Custom Domains
            </h2>
            {!profile.is_pro && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                PRO
              </span>
            )}
          </div>

          {!profile.is_pro ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm mb-4">
                Custom domains are available for Pro users.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-6 py-2.5 rounded-xl text-sm font-medium
                  bg-gradient-to-r from-accent-purple to-accent-blue
                  text-white shadow-lg shadow-accent-purple/25
                  hover:shadow-accent-purple/40
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300"
              >
                {upgrading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Redirecting…
                  </span>
                ) : (
                  "⚡ Upgrade to Pro"
                )}
              </button>
              <p className="text-xs text-text-muted mt-3">One-time payment · No subscription</p>
            </div>
          ) : (
            <div>
              {/* Existing domains */}
              {domains.length > 0 && (
                <div className="space-y-2 mb-4">
                  {domains.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated border border-border-subtle"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${d.verified ? "bg-green-400" : "bg-yellow-400"}`} />
                        <span className="text-sm font-mono">{d.domain}</span>
                      </div>
                      {!d.verified && (
                        <button
                          onClick={() => handleVerifyDomain(d.domain)}
                          className="text-xs text-accent-cyan hover:underline"
                        >
                          Verify DNS
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new domain */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="card.yourdomain.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-subtle
                    focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                    text-text-primary placeholder:text-text-muted transition-colors text-sm"
                />
                <button
                  onClick={handleAddDomain}
                  disabled={domainLoading || !newDomain}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium
                    bg-accent-blue/10 border border-accent-blue/30 text-accent-blue
                    hover:bg-accent-blue/20 disabled:opacity-50
                    transition-colors"
                >
                  {domainLoading ? "..." : "Add"}
                </button>
              </div>

              {domainError && (
                <p className="text-xs text-red-400 mt-2">{domainError}</p>
              )}

              <p className="text-xs text-text-muted mt-3">
                Add a CNAME record pointing to <code className="text-accent-cyan">cname.vercel-dns.com</code>
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
