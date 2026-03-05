"use client";

import { useAccount, useSignMessage } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface UserProfile {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  twitter?: string;
  github?: string;
  farcaster?: string;
  is_pro?: boolean;
}

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

interface DomainEntry {
  id: string;
  domain: string;
  verified: boolean;
  dnsRecords?: DnsRecord[];
}

// Wrapper with Suspense boundary for useSearchParams
export default function SettingsPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-grid">
          <div className="text-text-secondary">Loading...</div>
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
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  /**
   * Construct the same deterministic message that the server expects.
   * Must match lib/auth.ts → getDomainAuthMessage()
   */
  const getDomainAuthMessage = (action: "add" | "verify" | "delete", domain: string) =>
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
  const [dnsConfigLoading, setDnsConfigLoading] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

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
    setToast(null);

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
        showToast("error", data.error || "Failed to add domain");
      } else {
        const newEntry: DomainEntry = {
          ...data.domain,
          dnsRecords: data.dnsRecords || [],
        };
        setDomains((prev) => [...prev, newEntry]);
        setNewDomain("");
        // Auto-expand DNS config for the newly added domain
        setExpandedDomain(data.domain.domain);
        showToast("success", t("domainAdded"));
      }
    } catch {
      showToast("error", t("networkError"));
    } finally {
      setDomainLoading(false);
    }
  };

  const handleFetchDnsConfig = async (domain: string) => {
    // Toggle: if already expanded, collapse
    if (expandedDomain === domain) {
      setExpandedDomain(null);
      return;
    }

    // Check if we already have DNS records cached in state
    const existing = domains.find((d) => d.domain === domain);
    if (existing?.dnsRecords && existing.dnsRecords.length > 0) {
      setExpandedDomain(domain);
      return;
    }

    // Fetch from API
    if (!address) return;
    setDnsConfigLoading(domain);
    try {
      const res = await fetch(
        `/api/domains/config?domain=${encodeURIComponent(domain)}&wallet=${address}`
      );
      const data = await res.json();
      if (res.ok && data.dnsRecords) {
        setDomains((prev) =>
          prev.map((d) =>
            d.domain === domain ? { ...d, dnsRecords: data.dnsRecords } : d
          )
        );
        setExpandedDomain(domain);
      }
    } catch {
      console.error("Failed to fetch DNS config");
    } finally {
      setDnsConfigLoading(null);
    }
  };

  const handleDeleteDomain = async (domain: string) => {
    if (!address) return;

    const confirmMsg = t("deleteConfirm").replace("{domain}", domain);
    if (!window.confirm(confirmMsg)) return;

    setDeletingDomain(domain);
    try {
      const message = getDomainAuthMessage("delete", domain);
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/domains/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address, domain, signature }),
      });

      const data = await res.json();
      if (res.ok) {
        setDomains((prev) => prev.filter((d) => d.domain !== domain));
        if (expandedDomain === domain) setExpandedDomain(null);
        showToast("success", t("deleteSuccess").replace("{domain}", domain));
      } else {
        showToast("error", data.error || "Failed to delete domain");
      }
    } catch (err) {
      console.error("Delete domain error:", err);
      showToast("error", t("networkError"));
    } finally {
      setDeletingDomain(null);
    }
  };

  const handleVerifyDomain = async (domain: string) => {
    if (!address) return;
    setVerifyingDomain(domain);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, wallet_address: address }),
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        setDomains((prev) =>
          prev.map((d) => (d.domain === domain ? { ...d, verified: true } : d))
        );
        setExpandedDomain(null);
        showToast("success", t("verifySuccess"));
      } else {
        // Show DNS records returned from server on verification failure
        if (data.dnsRecords && data.dnsRecords.length > 0) {
          setDomains((prev) =>
            prev.map((d) =>
              d.domain === domain ? { ...d, dnsRecords: data.dnsRecords } : d
            )
          );
          setExpandedDomain(domain);
        }
        showToast("error", data.error || t("verifyFailed"));
      }
    } catch {
      showToast("error", t("networkError"));
    } finally {
      setVerifyingDomain(null);
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
        showToast("error", data.error || "Failed to start checkout");
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      showToast("error", t("networkError"));
    } finally {
      setUpgrading(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-grid">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-text-secondary">{t("connectPrompt")}</p>
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
          {t("loadingSettings")}
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
            <span className="text-sm">{tc("home")}</span>
          </a>
          {address && (
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => router.push(`/profile/${address}`)}
                className="text-sm text-accent-purple hover:text-accent-blue transition-colors"
              >
                {t("viewMyCard")}
              </button>
            </div>
          )}
        </nav>

        <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

        {/* Upgrade Success Banner */}
        {upgradeSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-400">{t("upgradeSuccess")}</p>
              <p className="text-xs text-green-400/70">{t("upgradeSuccessDesc")}</p>
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
            {t("profile")}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">{t("displayName")}</label>
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
              <label className="block text-sm text-text-secondary mb-1.5">{t("bio")}</label>
              <textarea
                value={profile.bio || ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder={t("bioPlaceholder")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-subtle
                  focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/25
                  text-text-primary placeholder:text-text-muted transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">{t("avatarUrl")}</label>
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
            {t("socialLinks")}
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
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {saved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t("saved")}
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
              {t("customDomains")}
            </h2>
            {!profile.is_pro && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                {t("pro")}
              </span>
            )}
          </div>

          {!profile.is_pro ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm mb-4">
                {t("domainsProOnly")}
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
                  t("upgradeToPro")
                )}
              </button>
              <p className="text-xs text-text-muted mt-3">{t("oneTimePayment")}</p>
            </div>
          ) : (
            <div>
              {/* Existing domains */}
              {domains.length > 0 && (
                <div className="space-y-3 mb-4">
                  {domains.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${d.verified ? "bg-green-400" : "bg-yellow-400"}`} />
                          <span className="text-sm font-mono">{d.domain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!d.verified && (
                            <>
                              <button
                                onClick={() => handleFetchDnsConfig(d.domain)}
                                disabled={dnsConfigLoading === d.domain}
                                className="text-xs text-accent-purple hover:text-accent-blue transition-colors"
                              >
                                {dnsConfigLoading === d.domain
                                  ? "..."
                                  : expandedDomain === d.domain
                                  ? t("hideDNS")
                                  : t("showDNS")}
                              </button>
                              <button
                                onClick={() => handleVerifyDomain(d.domain)}
                                disabled={verifyingDomain === d.domain}
                                className="text-xs text-accent-cyan hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {verifyingDomain === d.domain && (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                )}
                                {verifyingDomain === d.domain ? t("verifying") : t("verifyDNS")}
                              </button>
                            </>
                          )}
                          {d.verified && (
                            <span className="text-xs text-green-400">{t("verified")}</span>
                          )}
                          <button
                            onClick={() => handleDeleteDomain(d.domain)}
                            disabled={deletingDomain === d.domain}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingDomain === d.domain ? t("deleting") : t("deleteDomain")}
                          </button>
                        </div>
                      </div>

                      {/* DNS Records Panel */}
                      {!d.verified && expandedDomain === d.domain && d.dnsRecords && d.dnsRecords.length > 0 && (
                        <div className="border-t border-border-subtle bg-bg-primary/50 p-3">
                          <p className="text-xs text-text-secondary mb-2">
                            {t("dnsInstructions")}
                          </p>
                          <div className="space-y-2">
                            {d.dnsRecords.map((rec, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-[60px_1fr_1fr] gap-2 text-xs font-mono"
                              >
                                <span className="px-2 py-1.5 rounded bg-accent-purple/10 text-accent-purple text-center font-semibold">
                                  {rec.type}
                                </span>
                                <span
                                  className="px-2 py-1.5 rounded bg-bg-elevated border border-border-subtle text-text-primary truncate cursor-pointer hover:bg-bg-primary transition-colors"
                                  title={rec.name}
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.name);
                                  }}
                                >
                                  {rec.name}
                                </span>
                                <span
                                  className="px-2 py-1.5 rounded bg-bg-elevated border border-border-subtle text-accent-cyan truncate cursor-pointer hover:bg-bg-primary transition-colors"
                                  title={rec.value}
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.value);
                                  }}
                                >
                                  {rec.value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-text-muted mt-2">
                            {t("clickToCopy")}
                          </p>
                        </div>
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
                  placeholder={t("domainPlaceholder")}
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
                  {domainLoading ? "..." : t("addDomain")}
                </button>
              </div>

              <p className="text-xs text-text-muted mt-3">
                {t("cnameHintNew")}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm max-w-sm ${
              toast.type === "success"
                ? "bg-green-500/10 border-green-500/30 shadow-green-500/10"
                : toast.type === "error"
                ? "bg-red-500/10 border-red-500/30 shadow-red-500/10"
                : "bg-accent-blue/10 border-accent-blue/30 shadow-accent-blue/10"
            }`}
          >
            {/* Icon */}
            {toast.type === "success" && (
              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            {/* Message */}
            <p className={`text-sm ${
              toast.type === "success"
                ? "text-green-400"
                : toast.type === "error"
                ? "text-red-400"
                : "text-accent-blue"
            }`}>
              {toast.message}
            </p>

            {/* Close */}
            <button
              onClick={() => setToast(null)}
              className={`flex-shrink-0 ml-2 transition-colors ${
                toast.type === "success"
                  ? "text-green-400/50 hover:text-green-400"
                  : toast.type === "error"
                  ? "text-red-400/50 hover:text-red-400"
                  : "text-accent-blue/50 hover:text-accent-blue"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
