import { Metadata } from "next";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Signal Theory — Detection, Intensity, and Cross-Layer Amplification",
  description:
    "Deep dive into NEXUS signal detection: intensity scoring from 1-5, temporal decay functions, noise floor filtering, cross-layer amplification curves, and how independent data domains create meaningful convergence events.",
  keywords: [
    "signal detection theory",
    "intensity scoring",
    "cross-layer amplification",
    "temporal decay functions",
    "convergence signals",
    "geopolitical signal analysis",
    "market signal detection",
    "OSINT signal processing",
  ],
  openGraph: {
    title: "Signal Theory — NEXUS Intelligence",
    description:
      "Deep dive into signal detection, intensity scoring, decay functions, and cross-layer amplification. How independent data domains create meaningful convergence.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal Theory — NEXUS Intelligence",
    description:
      "Signal detection, intensity scoring, decay functions, and cross-layer amplification across geopolitical, market, and OSINT domains.",
  },
  alternates: {
    canonical: "/research/signal-theory",
  },
};

export default function SignalTheoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "Signal Theory", url: "/research/signal-theory" },
      ]} />
      <ArticleJsonLd
        title="Signal Theory — Detection, Intensity, and Cross-Layer Amplification"
        description="Deep dive into NEXUS signal detection: intensity scoring, temporal decay functions, cross-layer amplification curves, and how independent data domains create meaningful convergence events."
        url="/research/signal-theory"
        datePublished="2025-01-01"
      />
      {children}
    </>
  );
}
