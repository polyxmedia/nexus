import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whitepapers — NEXUS Intelligence Research",
  description:
    "In-depth NEXUS research papers on geopolitical-market convergence, signal detection methodology, predictive accuracy frameworks, and the theoretical foundations of multi-layer intelligence analysis.",
  keywords: [
    "geopolitical intelligence whitepapers",
    "market intelligence research",
    "signal detection research",
    "convergence analysis papers",
    "intelligence methodology research",
  ],
  openGraph: {
    title: "Whitepapers — NEXUS Intelligence Research",
    description:
      "In-depth research papers on geopolitical-market convergence, signal theory, and predictive intelligence methodology.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whitepapers — NEXUS Intelligence",
    description:
      "In-depth research on geopolitical-market convergence, signal detection, and predictive intelligence methodology.",
  },
  alternates: {
    canonical: "/research/whitepapers",
  },
};

export default function WhitepapersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
