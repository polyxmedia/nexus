import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { AuthProvider } from "@/components/providers/session-provider";
import { AnalyticsTracker } from "@/components/analytics/tracker";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { OutageBanner } from "@/components/layout/outage-banner";
import { TrialBanner } from "@/components/subscription/trial-banner";
import { SubscriptionProvider } from "@/lib/hooks/useSubscription";
import { OrganizationJsonLd, WebSiteJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { CookieConsent } from "@/components/cookie-consent";
import { Web3Provider } from "@/components/providers/web3-provider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

export const viewport = {
  viewportFit: 'cover' as const,
  initialScale: 1,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NEXUS Intelligence — Geopolitical-Market Signal Platform",
    template: "%s | NEXUS Intelligence",
  },
  description:
    "NEXUS integrates geopolitical, market, OSINT, and systemic risk signals into one platform. AI-driven convergence analysis, game theory scenarios, and prediction tracking for analysts, traders, and institutions.",
  keywords: [
    "geopolitical intelligence",
    "market intelligence platform",
    "signal detection",
    "convergence analysis",
    "OSINT platform",
    "trading signals",
    "geopolitical risk analysis",
    "AI intelligence platform",
    "Brier score prediction tracking",
    "game theory geopolitics",
    "war room intelligence",
    "multi-layer signal analysis",
  ],
  authors: [{ name: "Andre Figueira", url: "https://polyxmedia.com" }],
  creator: "Polyxmedia",
  publisher: "NEXUS Intelligence",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: "NEXUS Intelligence",
    title: "NEXUS Intelligence — Geopolitical-Market Signal Platform",
    description:
      "Four primary signal layers + narrative overlay. AI-driven convergence analysis. Intelligence briefs before consensus. Built for analysts, traders, and institutions.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@polyxmedia",
    creator: "@polyxmedia",
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexus-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dim';}document.documentElement.classList.remove('light','dim','soft');if(t==='light'||t==='dim'||t==='soft')document.documentElement.classList.add(t);}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')});}`,
          }}
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <SoftwareApplicationJsonLd />
      </head>
      <body className="min-h-screen bg-navy-950 text-navy-100 antialiased" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <AuthProvider>
          <Web3Provider>
            <NotificationProvider>
              <SubscriptionProvider>
                <OutageBanner />
                <ImpersonationBanner />
                <TrialBanner />
                <Sidebar />
                {children}
                <NotificationToast />
                <AnalyticsTracker />
              </SubscriptionProvider>
            </NotificationProvider>
            <CookieConsent />
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
