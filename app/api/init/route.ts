import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

/**
 * GET /api/init
 * Initialize database tables — call once on first deployment
 */
export async function GET(request: NextRequest) {
  // Simple auth check — only allow with a secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.VERCEL_TOKEN;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDatabase();
    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
