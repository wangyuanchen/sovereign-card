import { neon } from "@neondatabase/serverless";

/**
 * Check if the database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Get a SQL query executor connected to Neon PostgreSQL
 * Throws if DATABASE_URL is not set — callers should check isDatabaseConfigured() first
 */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
      "Create a .env.local file from .env.example and fill in your Neon connection string."
    );
  }
  return neon(process.env.DATABASE_URL);
}

/**
 * Initialize database tables
 * Run this once on first deployment or call from an API route
 */
export async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_address TEXT UNIQUE NOT NULL,
      ens_name TEXT,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      twitter TEXT,
      github TEXT,
      farcaster TEXT,
      is_pro BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS custom_domains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      domain TEXT UNIQUE NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      vercel_domain_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS profile_cache (
      wallet_address TEXT PRIMARY KEY,
      nfts JSONB,
      tokens JSONB,
      transactions JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log("✅ Database tables initialized");
}

// ─── User Queries ──────────────────────────────────────

export async function getUserByWallet(walletAddress: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM users WHERE wallet_address = ${walletAddress.toLowerCase()}
  `;
  return rows[0] ?? null;
}

export async function upsertUser(walletAddress: string, ensName?: string) {
  const sql = getDb();
  const addr = walletAddress.toLowerCase();
  const rows = await sql`
    INSERT INTO users (wallet_address, ens_name)
    VALUES (${addr}, ${ensName ?? null})
    ON CONFLICT (wallet_address)
    DO UPDATE SET ens_name = COALESCE(EXCLUDED.ens_name, users.ens_name)
    RETURNING *
  `;
  return rows[0];
}

export async function updateUserProfile(
  walletAddress: string,
  data: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    twitter?: string;
    github?: string;
    farcaster?: string;
  }
) {
  const sql = getDb();
  const addr = walletAddress.toLowerCase();
  const rows = await sql`
    UPDATE users
    SET
      display_name = COALESCE(${data.display_name ?? null}, display_name),
      bio = COALESCE(${data.bio ?? null}, bio),
      avatar_url = COALESCE(${data.avatar_url ?? null}, avatar_url),
      twitter = COALESCE(${data.twitter ?? null}, twitter),
      github = COALESCE(${data.github ?? null}, github),
      farcaster = COALESCE(${data.farcaster ?? null}, farcaster)
    WHERE wallet_address = ${addr}
    RETURNING *
  `;
  return rows[0] ?? null;
}

// ─── Custom Domains ────────────────────────────────────

export async function addCustomDomain(userId: string, domain: string) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO custom_domains (user_id, domain)
    VALUES (${userId}, ${domain.toLowerCase()})
    RETURNING *
  `;
  return rows[0];
}

export async function verifyCustomDomain(domain: string, vercelDomainId: string) {
  const sql = getDb();
  const rows = await sql`
    UPDATE custom_domains
    SET verified = TRUE, vercel_domain_id = ${vercelDomainId}
    WHERE domain = ${domain.toLowerCase()}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function deleteCustomDomain(userId: string, domain: string) {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM custom_domains
    WHERE user_id = ${userId} AND domain = ${domain.toLowerCase()}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getDomainsByUser(userId: string) {
  const sql = getDb();
  return sql`
    SELECT * FROM custom_domains WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
}

export async function getDomainByName(domain: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT cd.*, u.wallet_address FROM custom_domains cd
    JOIN users u ON cd.user_id = u.id
    WHERE cd.domain = ${domain.toLowerCase()}
  `;
  return rows[0] ?? null;
}

export async function getUserByDomain(domain: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT u.* FROM users u
    JOIN custom_domains cd ON u.id = cd.user_id
    WHERE cd.domain = ${domain.toLowerCase()} AND cd.verified = TRUE
  `;
  return rows[0] ?? null;
}

// ─── Profile Cache ─────────────────────────────────────

export async function getCachedProfile(walletAddress: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM profile_cache
    WHERE wallet_address = ${walletAddress.toLowerCase()}
      AND updated_at > NOW() - INTERVAL '30 minutes'
  `;
  return rows[0] ?? null;
}

export async function setCachedProfile(
  walletAddress: string,
  data: { nfts?: unknown; tokens?: unknown; transactions?: unknown }
) {
  const sql = getDb();
  const addr = walletAddress.toLowerCase();
  await sql`
    INSERT INTO profile_cache (wallet_address, nfts, tokens, transactions, updated_at)
    VALUES (
      ${addr},
      ${JSON.stringify(data.nfts ?? null)},
      ${JSON.stringify(data.tokens ?? null)},
      ${JSON.stringify(data.transactions ?? null)},
      NOW()
    )
    ON CONFLICT (wallet_address)
    DO UPDATE SET
      nfts = COALESCE(${JSON.stringify(data.nfts ?? null)}::jsonb, profile_cache.nfts),
      tokens = COALESCE(${JSON.stringify(data.tokens ?? null)}::jsonb, profile_cache.tokens),
      transactions = COALESCE(${JSON.stringify(data.transactions ?? null)}::jsonb, profile_cache.transactions),
      updated_at = NOW()
  `;
}
