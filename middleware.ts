import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to handle custom domain routing on Vercel
 * When a request comes from a custom domain, rewrite it to the corresponding
 * user's profile page via the custom-domain catch-all route
 */
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // ── Skip default / platform domains ──────────────────────
  // Vercel injects VERCEL_URL (e.g. my-app-abc123.vercel.app) and
  // VERCEL_PROJECT_PRODUCTION_URL for the primary *.vercel.app alias.
  const defaultDomains = [
    "localhost:3000",
    "localhost",
    // Primary *.vercel.app domain — set in Vercel dashboard
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    // Preview deployment URL (changes per deploy)
    process.env.VERCEL_URL,
    // Hardcode your production domain here when you have one:
    // "sovereign-card.vercel.app",
  ].filter(Boolean) as string[];

  const isDefaultDomain = defaultDomains.some(
    (d) =>
      hostname === d ||
      hostname.endsWith(`.${d}`) ||
      // Always allow any *.vercel.app address (previews, branch deploys)
      hostname.endsWith(".vercel.app")
  );

  if (isDefaultDomain) {
    return NextResponse.next();
  }

  // ── Custom domain detected ───────────────────────────────
  // Rewrite to the internal catch-all route that looks up the
  // domain → user mapping in the database at render time.
  try {
    const rewriteUrl = new URL(
      `/custom-domain/${hostname}${url.pathname}`,
      request.url
    );

    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-custom-domain", hostname);
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api        (API routes)
     * - _next      (Next.js internals)
     * - favicon.ico
     * - public folder files (images, robots.txt, etc.)
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\..*).*)",
  ],
};
