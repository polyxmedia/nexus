import { Metadata } from "next";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Calendar Correlations — Hebrew, Islamic, and Fiscal Market Patterns",
  description:
    "Historical analysis of calendar-market patterns across Hebrew, Islamic, and fiscal cycles. Treated as narrative overlay and actor-belief context within NEXUS, not independent predictive signals.",
  keywords: [
    "calendar market correlations",
    "Hebrew calendar markets",
    "Islamic calendar trading",
    "fiscal year market patterns",
    "FOMC cycle analysis",
    "options expiry patterns",
    "actor-belief market context",
    "narrative overlay intelligence",
  ],
  openGraph: {
    title: "Calendar Correlations — NEXUS Intelligence",
    description:
      "Historical calendar-market patterns: Hebrew, Islamic, and fiscal cycles as actor-belief context. Narrative overlay analysis, not independent predictive signals.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendar Correlations — NEXUS Intelligence",
    description:
      "Calendar-market patterns as actor-belief context. Hebrew, Islamic, and fiscal cycles analysed as narrative overlay.",
  },
  alternates: {
    canonical: "/research/calendar-correlations",
  },
};

export default function CalendarCorrelationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "Calendar Correlations", url: "/research/calendar-correlations" },
      ]} />
      <ArticleJsonLd
        title="Calendar Correlations — Hebrew, Islamic, and Fiscal Market Patterns"
        description="Historical analysis of calendar-market patterns across Hebrew, Islamic, and fiscal cycles. Actor-belief context within NEXUS, not independent predictive signals."
        url="/research/calendar-correlations"
        datePublished="2025-01-01"
      />
      {children}
    </>
  );
}
