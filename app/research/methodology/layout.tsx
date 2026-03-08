import { Metadata } from "next";

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
  ],
  openGraph: {
    title: "Methodology — How NEXUS Detects What Others Miss",
    description:
      "Five independent signal layers. Non-linear convergence scoring. AI synthesis grounded in observable data. Full outcome tracking with Brier scoring.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology — NEXUS Intelligence",
    description:
      "Five independent signal layers. Non-linear convergence scoring. AI synthesis grounded in observable data.",
  },
  alternates: {
    canonical: "/research/methodology",
  },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
