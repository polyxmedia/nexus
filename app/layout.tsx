import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationToast } from "@/components/notifications/notification-toast";
import { AuthProvider } from "@/components/providers/session-provider";
import { AnalyticsTracker } from "@/components/analytics/tracker";
import { SubscriptionProvider } from "@/lib/hooks/useSubscription";

export const metadata: Metadata = {
  title: "NEXUS - Signal Intelligence",
  description: "Celestial-geopolitical market intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
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
