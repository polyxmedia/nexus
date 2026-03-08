import { withAuth } from "next-auth/middleware";

export default withAuth({
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
    "/api/referrals/:path*",
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
