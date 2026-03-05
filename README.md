# Sovereign Card — Web3 Identity Card Generator

> 🔗 Connect wallet → generate a shareable on-chain identity card with your NFTs, tokens, and activity.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🦊 **Wallet Connect** — MetaMask, WalletConnect, and 300+ wallets via RainbowKit
- 🖼️ **NFT Showcase** — Beautiful grid with detail modal
- 💰 **Token Portfolio** — Holdings with real-time USD values
- 📊 **Activity Feed** — Recent on-chain transactions
- 🌐 **Custom Domains** — Pro users can link their own domain
- ⚡ **One-time Pro Upgrade** — Pay once, Pro forever (no subscriptions)
- 🗄️ **30-min Cache** — Reduces GoldRush API credits usage
- 🌙 **Dark Theme** — Cyber-aesthetic design, screenshot-ready for sharing

## Tech Stack

- **Next.js 14** App Router + TypeScript
- **Tailwind CSS** — dark cyber-aesthetic theme
- **Neon** (PostgreSQL) — `@neondatabase/serverless`
- **GoldRush / Covalent** — on-chain data (NFTs, tokens, transactions)
- **wagmi + RainbowKit** — wallet connect (MetaMask, WalletConnect)
- **Vercel** — deployment & custom domain management

---

## Deploy to Vercel

### 1. Prerequisites

| Service | Sign-up URL | What you need |
|---|---|---|
| **Neon** | https://console.neon.tech | PostgreSQL connection string |
| **GoldRush** | https://goldrush.dev/platform/apikey | API key |
| **WalletConnect** | https://cloud.walletconnect.com | Project ID |
| **Vercel** | https://vercel.com | Account + API Token |

### 2. One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USER%2Fsovereign-card&env=DATABASE_URL,GOLDRUSH_API_KEY,NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,SC_VERCEL_TOKEN,SC_VERCEL_PROJECT_ID)

Or deploy manually:

```bash
npm i -g vercel
vercel
```

### 3. Environment Variables

In the Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GOLDRUSH_API_KEY` | GoldRush (Covalent) API key |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `SC_VERCEL_TOKEN` | Vercel API token (for domain management) |
| `SC_VERCEL_PROJECT_ID` | Your Vercel project ID |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_` or `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_`) |
| `STRIPE_PRICE_ID` | Stripe Price ID for Pro product (`price_`) |

> Copy `.env.example` → `.env.local` for local dev.

### 4. Initialize Database

After first deploy, hit the init endpoint to create tables:

```bash
curl -H "Authorization: Bearer YOUR_SC_VERCEL_TOKEN" \
  https://your-app.vercel.app/api/init
```

---

## Local Development

```bash
# Install
npm install

# Copy env
cp .env.example .env.local
# Fill in your values in .env.local

# Run
npm run dev
```

Open http://localhost:3000

---

## Project Structure

```
app/
├── layout.tsx                 # Root layout with wagmi Provider
├── page.tsx                   # Home — wallet connect entrance
├── providers.tsx              # Client providers (wagmi, RainbowKit, React Query)
├── profile/[wallet]/page.tsx  # Public profile card page
├── settings/page.tsx          # User settings (bio, socials, domains)
├── custom-domain/[...path]/   # Custom domain renderer
└── api/
    ├── profile/route.ts       # GET / POST / PUT user profile
    ├── domains/add/route.ts   # Add custom domain → Vercel API
    ├── domains/verify/route.ts# Verify domain DNS via Vercel API
    ├── webhook/route.ts       # Payment callback (upgrade to Pro)
    └── init/route.ts          # DB table initialization

components/
├── ConnectWallet.tsx          # RainbowKit connect button
├── ProfileCard.tsx            # Identity card with avatar, ENS, socials
├── NFTGallery.tsx             # NFT grid with detail modal
├── TokenList.tsx              # Token holdings with USD value
└── ActivityFeed.tsx           # Recent on-chain transactions

lib/
├── db.ts                      # Neon SQL queries
├── goldrush.ts                # GoldRush API (NFT / Balance / Tx)
├── cache.ts                   # 30-min profile data cache
└── wagmi.ts                   # wagmi + chain config

middleware.ts                  # Custom domain → rewrite routing
vercel.json                    # Vercel config (headers, crons, region)
```

## Custom Domain Flow

1. Pro user adds `card.example.com` in Settings
2. API adds domain to Vercel project via Vercel REST API
3. User sets `CNAME card.example.com → cname.vercel-dns.com`
4. User clicks "Verify DNS" — calls Vercel domain verify API
5. Middleware detects non-default hostname → rewrites to `/custom-domain/[host]`
6. Page looks up domain → user mapping in DB and renders their card

## Payment Model

This project uses **Stripe Checkout** with a **one-time payment** model:

- Free users get full profile card features (NFTs, tokens, activity, socials)
- Pro upgrade unlocks custom domain binding
- Click "Upgrade to Pro" in Settings → redirected to Stripe Checkout
- Stripe webhook (`checkout.session.completed`) → permanently sets `is_pro = TRUE`
- No subscriptions, no recurring billing, no downgrade logic

### Stripe Setup

1. Create a product in [Stripe Dashboard → Products](https://dashboard.stripe.com/products) with a one-time price
2. Copy the Price ID (`price_xxx`) → set as `STRIPE_PRICE_ID`
3. Add webhook endpoint in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):
   - URL: `https://your-domain.com/api/webhook`
   - Events: `checkout.session.completed`
4. Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`

---

## License

[MIT](LICENSE)
