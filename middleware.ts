import { withAuth } from "next-auth/middleware";

// Public API paths that skip auth (used by public research pages, webhooks)
const PUBLIC_API_PATHS = [
  "/api/predictions/feedback",
  "/api/predictions/recent-resolved",
  "/api/telegram/webhook",
  "/api/stripe/webhook",
  "/api/subscription/tiers",
  "/api/analytics/track",
  "/api/referrals/click",
  "/api/health",
  "/api/debug/anthropic",
];

// API v1 uses its own Bearer token auth (withApiAuth HOF), not session auth
const isApiV1 = (pathname: string) => pathname.startsWith("/api/v1/");

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // Allow public API paths without auth
      if (PUBLIC_API_PATHS.some((p) => req.nextUrl.pathname === p)) return true;

      // API v1 handles its own auth via Bearer tokens
      if (isApiV1(req.nextUrl.pathname)) return true;

      // Allow internal scheduler calls with CRON_SECRET
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) {
        return true;
      }

      return !!token;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Deny-by-default: match ALL /api/ routes and app pages.
  // Public routes (auth, stripe webhook, etc.) are handled in the authorized callback above
  // or are excluded by Next.js (e.g. /api/auth/* is handled by NextAuth directly).
  matcher: [
    "/api/((?!auth|_next).*)",
    // Protect app pages
    "/chat/:path*",
    "/dashboard/:path*",
    "/signals/:path*",
    "/predictions/:path*",
    "/trading/:path*",
    "/trade-lab/:path*",
    "/warroom/:path*",
    "/news/:path*",
    "/knowledge/:path*",
    "/alerts/:path*",
    "/calendar/:path*",
    "/graph/:path*",
    "/timeline/:path*",
    "/markets/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/actors/:path*",
    "/bocpd/:path*",
    "/support/:path*",
    "/reports/:path*",
  ],
};
