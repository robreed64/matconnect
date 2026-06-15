import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role       = (auth?.user as { role?: string })?.role ?? "";
      const path       = nextUrl.pathname;

      // Temporary passwords are good for exactly one login: force the change
      // screen before any portal/admin page renders
      if (isLoggedIn && (auth?.user as { mustChangePassword?: boolean })?.mustChangePassword) {
        return Response.redirect(new URL("/change-password", nextUrl.origin));
      }

      if (path.startsWith("/admin") || path.startsWith("/kiosk")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "parent") return Response.redirect(new URL("/portal", nextUrl.origin));
        if (role === "member") return Response.redirect(new URL("/member", nextUrl.origin));

        // front_desk can only access members, pos, schedule, kiosk
        if (role === "front_desk") {
          const allowed = ["/admin/members", "/admin/pos", "/admin/schedule", "/kiosk"];
          if (!allowed.some((p) => path.startsWith(p))) {
            return Response.redirect(new URL("/admin/members", nextUrl.origin));
          }
        }

        // manager/staff cannot access settings, setup, or user management
        if (role === "manager" || role === "staff") {
          const blocked = ["/admin/settings", "/admin/setup", "/admin/users"];
          if (blocked.some((p) => path.startsWith(p))) {
            return Response.redirect(new URL("/admin/members", nextUrl.origin));
          }
        }

        return true;
      }

      if (path.startsWith("/portal")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "member") return Response.redirect(new URL("/member", nextUrl.origin));
        return true;
      }

      if (path.startsWith("/member")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "parent") return Response.redirect(new URL("/portal", nextUrl.origin));
        return true;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role     = (user as { role?: string }).role;
        token.memberId = (user as { memberId?: number }).memberId;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: unknown }).id         = token.sub;
        (session.user as { role?: unknown }).role     = token.role;
        (session.user as { memberId?: unknown }).memberId = token.memberId;
        (session.user as { mustChangePassword?: unknown }).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
