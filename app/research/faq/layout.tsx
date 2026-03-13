import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

const faqItems = [
  { q: "What is NEXUS?", a: "NEXUS is a signal intelligence platform that monitors geopolitical, market, open-source intelligence, and systemic risk signals across global events. It identifies convergence patterns across independent data layers, generates predictive assessments, and provides structured intelligence briefs you can act on." },
  { q: "What kind of signals does NEXUS track?", a: "Four primary signal layers: GEO (conflicts, sanctions, diplomatic shifts), MKT (options flow, volatility, credit spreads), OSI (flight tracking, shipping, social media), and SYS (regime detection, macro indicators). A narrative overlay adds calendar and actor-belief context." },
  { q: "How are predictions scored?", a: "Every prediction is falsifiable and tracked with Brier scores, measuring calibration accuracy on a 0 to 1 scale (lower is better). The scoring system separates directional calls from level estimates, filters out stale predictions, and caps active volume to maintain statistical rigour." },
  { q: "Does NEXUS use AI? How do you handle hallucinations?", a: "Yes. AI is central to the platform. Every AI output is grounded in the platform's actual data layer: real signals, real market data, real OSINT feeds. The analyst cites specific sources and predictions are tracked against outcomes with published accuracy scores." },
  { q: "What subscription tiers are available?", a: "Three tiers: Observer ($199/month), Operator ($599/month), and Institution (custom pricing). All new accounts start with a free trial of 5,000 credits." },
  { q: "Can I track my portfolio on NEXUS?", a: "Yes. NEXUS includes manual portfolio tracking where you can log positions, track live prices, and monitor P&L across your holdings. Direct broker integrations with Trading 212, Coinbase, Interactive Brokers, and IG Markets are in development." },
  { q: "Is there a free trial?", a: "Yes. Every new account receives 5,000 credits at no cost, equivalent to approximately 60-250 chat interactions depending on complexity." },
];

export const metadata: Metadata = {
  title: "Frequently Asked Questions — NEXUS Intelligence",
  description:
    "Common questions about NEXUS Intelligence: signal layers, prediction scoring, AI analysis, subscription tiers, trading integration, credits, and getting started.",
  keywords: [
    "NEXUS FAQ",
    "geopolitical intelligence FAQ",
    "signal intelligence platform",
    "NEXUS pricing",
    "NEXUS subscription tiers",
    "prediction scoring Brier",
    "AI intelligence platform",
    "trading platform FAQ",
  ],
  openGraph: {
    title: "FAQ — NEXUS Intelligence",
    description:
      "Answers to common questions about NEXUS: signal detection, AI analysis, prediction tracking, subscriptions, trading integration, and getting started.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — NEXUS Intelligence",
    description:
      "Common questions about signal detection, AI analysis, prediction scoring, pricing, and trading integration.",
  },
  alternates: {
    canonical: "/research/faq",
  },
};

function FAQPageJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "FAQ", url: "/research/faq" },
      ]} />
      <FAQPageJsonLd />
      {children}
    </>
  );
}
