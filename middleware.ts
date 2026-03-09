import { withAuth } from "next-auth/middleware";

// Public API paths that skip auth (used by public research pages)
const PUBLIC_API_PATHS = [
  "/api/predictions/feedback",
  "/api/predictions/recent-resolved",
  "/api/telegram/webhook",
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
  matcher: [
    // Protect all API routes except auth, stripe webhook, and public endpoints
    "/api/chat/:path*",
    "/api/signals/:path*",
    "/api/predictions/:path*",
    "/api/trading212/:path*",
    "/api/coinbase/:path*",
    "/api/ibkr/:path*",
    "/api/ig/:path*",
    "/api/settings/:path*",
    "/api/knowledge/:path*",
    "/api/warroom/:path*",
    "/api/portfolio/:path*",
    "/api/scheduler/:path*",
    "/api/thesis/:path*",
    "/api/analysis/:path*",
    "/api/alerts/:path*",
    "/api/dashboard/:path*",
    "/api/market-data/:path*",
    "/api/markets/:path*",
    "/api/macro/:path*",
    "/api/options/:path*",
    "/api/osint/:path*",
    "/api/news/:path*",
    "/api/calendar/:path*",
    "/api/esoteric/:path*",
    "/api/game-theory/:path*",
    "/api/graph/:path*",
    "/api/timeline/:path*",
    "/api/watchlists/:path*",
    "/api/admin/:path*",
    "/api/v1/:path*",
    "/api/referrals/:path*",
    "/api/telegram/:path*",
    // Protect app pages
    "/chat/:path*",
    "/dashboard/:path*",
    "/signals/:path*",
    "/predictions/:path*",
    "/trading/:path*",
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
  ],
};
