import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar Correlations — Hebrew, Islamic, and Fiscal Market Patterns",
  description:
    "Historical analysis of calendar-market correlations in the NEXUS system: Hebrew calendar cycles, Islamic calendar events, FOMC windows, options expiry patterns, and fiscal year boundaries.",
  keywords: [
    "calendar market correlations",
    "Hebrew calendar market",
    "Islamic calendar trading",
    "FOMC calendar",
    "options expiry patterns",
    "fiscal calendar market analysis",
    "seasonal market patterns",
  ],
  openGraph: {
    title: "Calendar Correlations — NEXUS Intelligence",
    description:
      "Historical analysis of how Hebrew, Islamic, and fiscal calendar systems correlate with significant market movements. Data-backed pattern analysis.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendar Correlations — NEXUS Intelligence",
    description:
      "How Hebrew, Islamic, and fiscal calendar cycles correlate with market dislocations. Historical pattern analysis.",
  },
  alternates: {
    canonical: "/research/calendar-correlations",
  },
};

export default function CalendarCorrelationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
