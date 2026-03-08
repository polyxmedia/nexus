import { Metadata } from "next";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Methodology — How NEXUS Detects What Others Miss",
  description:
    "A detailed breakdown of the NEXUS four-phase intelligence pipeline: multi-layer signal detection, convergence analysis, AI-driven synthesis, and outcome-tracked feedback loops.",
  keywords: [
    "geopolitical intelligence methodology",
    "signal convergence analysis",
    "market intelligence pipeline",
    "OSINT methodology",
    "AI intelligence synthesis",
    "prediction tracking",
    "Brier score methodology",
    "multi-layer signal detection",
  ],
  openGraph: {
    title: "Methodology — How NEXUS Detects What Others Miss",
    description:
      "Four primary signal layers + narrative overlay. Non-linear convergence scoring. AI synthesis grounded in observable data. Full outcome tracking with Brier scoring.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology — NEXUS Intelligence",
    description:
      "Four primary signal layers + narrative overlay. Non-linear convergence scoring. AI synthesis grounded in observable data.",
  },
  alternates: {
    canonical: "/research/methodology",
  },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "Methodology", url: "/research/methodology" },
      ]} />
      <ArticleJsonLd
        title="Methodology — How NEXUS Detects What Others Miss"
        description="A detailed breakdown of the NEXUS four-phase intelligence pipeline: multi-layer signal detection, convergence analysis, AI-driven synthesis, and outcome-tracked feedback loops."
        url="/research/methodology"
        datePublished="2025-01-01"
      />
      {children}
    </>
  );
}
