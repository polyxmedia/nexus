import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { AuthProvider } from "@/components/providers/session-provider";
import { AnalyticsTracker } from "@/components/analytics/tracker";
import { SubscriptionProvider } from "@/lib/hooks/useSubscription";
import { OrganizationJsonLd, WebSiteJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

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
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NEXUS Intelligence Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS Intelligence — Geopolitical-Market Signal Platform",
    description:
      "Four primary signal layers + narrative overlay. AI-driven convergence analysis. Intelligence briefs before consensus.",
    images: ["/opengraph-image"],
    creator: "@polyxmedia",
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexus-theme');if(t==='light'){document.documentElement.classList.add('light');}else{document.documentElement.classList.remove('light');}}catch(e){}})();`,
          }}
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <SoftwareApplicationJsonLd />
      </head>
      <body className="min-h-screen bg-navy-950 text-navy-100 antialiased">
        <AuthProvider>
          <NotificationProvider>
            <SubscriptionProvider>
              <Sidebar />
              {children}
              <NotificationToast />
              <AnalyticsTracker />
            </SubscriptionProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
