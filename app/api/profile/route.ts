import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWallet,
  upsertUser,
  updateUserProfile,
  getDomainsByUser,
  isDatabaseConfigured,
} from "@/lib/db";

/**
 * GET /api/profile?wallet=0x...
 * Fetch user profile and their domains
 */
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet parameter" }, { status: 400 });
  }

  // Gracefully handle missing database
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null, domains: [], _warning: "DATABASE_URL not configured" });
  }

  try {
    const user = await getUserByWallet(wallet);
    if (!user) {
      return NextResponse.json({ user: null, domains: [] });
    }

    const domains = await getDomainsByUser(user.id);
    return NextResponse.json({ user, domains });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Create or register a user on wallet connect
 * Body: { wallet_address: string, ens_name?: string }
 */
export async function POST(request: NextRequest) {
  // Gracefully handle missing database
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { user: null, _warning: "DATABASE_URL not configured. User not saved." },
      { status: 200 }
    );
  }

  try {
    const body = await request.json();
    const { wallet_address, ens_name } = body;

    if (!wallet_address) {
      return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
    }

    const user = await upsertUser(wallet_address, ens_name);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 * Update user profile settings
 * Body: { wallet_address: string, display_name?, bio?, avatar_url?, twitter?, github?, farcaster? }
 */
export async function PUT(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { wallet_address, ...profileData } = body;

    if (!wallet_address) {
      return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
    }

    // Ensure user exists
    const existing = await getUserByWallet(wallet_address);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await updateUserProfile(wallet_address, profileData);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
