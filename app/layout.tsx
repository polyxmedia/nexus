import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

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
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
