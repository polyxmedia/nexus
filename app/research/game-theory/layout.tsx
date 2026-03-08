import { Metadata } from "next";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Game Theory Models — Strategic Decision Analysis for Geopolitical Events",
  description:
    "Game theory frameworks applied to geopolitical-market analysis: Nash equilibria in conflict scenarios, signalling games, deterrence models, escalation ladders, and strategic interaction patterns that precede market dislocations.",
  keywords: [
    "game theory geopolitics",
    "Nash equilibrium market",
    "geopolitical signalling games",
    "deterrence theory markets",
    "strategic interaction analysis",
    "conflict market modelling",
    "Schelling focal points",
    "escalation ladder analysis",
  ],
  openGraph: {
    title: "Game Theory Models — NEXUS Intelligence",
    description:
      "Nash equilibria, signalling games, and deterrence models applied to geopolitical-market analysis. How strategic actor behaviour predicts market outcomes.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Theory Models — NEXUS Intelligence",
    description:
      "Nash equilibria and deterrence models applied to geopolitical-market analysis. Strategic interaction that precedes market moves.",
  },
  alternates: {
    canonical: "/research/game-theory",
  },
};

export default function GameTheoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "Game Theory Models", url: "/research/game-theory" },
      ]} />
      <ArticleJsonLd
        title="Game Theory Models — Strategic Decision Analysis for Geopolitical Events"
        description="Game theory frameworks applied to geopolitical-market analysis: Nash equilibria, signalling games, deterrence models, and escalation ladders."
        url="/research/game-theory"
        datePublished="2025-01-01"
      />
      {children}
    </>
  );
}
