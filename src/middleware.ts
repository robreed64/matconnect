import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Instantiate once at module level — not per-request
const { auth: nextAuthGuard } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname;
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "";

  // Phase 1: rewrite custom domain → /site
  if (siteDomain && (host === siteDomain || host === `www.${siteDomain}`)) {
    const { pathname } = request.nextUrl;
    // Guard: /site sub-path on custom domain would double-nest to /site/site
    if (pathname.startsWith("/site")) return NextResponse.next();
    if (
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/portal") &&
      !pathname.startsWith("/member") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/widget")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/site" + (pathname === "/" ? "" : pathname);
      return NextResponse.rewrite(url);
    }
  }

  // Phase 2: auth guard — only for the routes NextAuth was previously protecting.
  // Scoping prevents a redirect loop: mustChangePassword users sent to /change-password
  // would otherwise hit the guard again and be redirected back indefinitely.
  const p = request.nextUrl.pathname;
  if (
    p.startsWith("/admin") ||
    p.startsWith("/portal") ||
    p.startsWith("/member") ||
    p.startsWith("/kiosk")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (nextAuthGuard as any)(request);
  }
  return NextResponse.next();
}

export const config = {
  // Broader matcher: hostname check must fire before Next.js routing
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
