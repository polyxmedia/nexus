import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Theory Models — Strategic Decision Analysis for Geopolitical Events",
  description:
    "Game theory frameworks applied to geopolitical-market analysis: Nash equilibria in conflict scenarios, signalling games, deterrence models, and strategic interaction patterns that precede market dislocations.",
  keywords: [
    "game theory geopolitics",
    "Nash equilibrium market",
    "geopolitical signalling games",
    "deterrence theory markets",
    "strategic interaction analysis",
    "conflict market modelling",
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
  return <>{children}</>;
}
