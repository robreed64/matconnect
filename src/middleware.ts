import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export async function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname;
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "";

  // Phase 1: rewrite custom domain → /site
  if (siteDomain && (host === siteDomain || host === `www.${siteDomain}`)) {
    const { pathname } = request.nextUrl;
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

  // Phase 2: existing auth guard — run NextAuth middleware for protected routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (NextAuth(authConfig).auth as any)(request);
}

export const config = {
  // Broader matcher: hostname check must fire before Next.js routing
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
