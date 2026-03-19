import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Prediction Track Record | NEXUS Intelligence",
  description:
    "Every prediction NEXUS makes is tracked, scored, and published. See our live Brier scores, hit rates, and resolved predictions. No curation, no cherry-picking.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
