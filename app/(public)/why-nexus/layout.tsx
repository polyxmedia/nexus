import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why NEXUS | Intelligence Infrastructure for a Complex World",
  description:
    "Compare NEXUS to Bloomberg, Recorded Future, Stratfor, and AI trading tools. See why NEXUS is the only platform that fuses geopolitical intelligence, market analysis, AI predictions, and execution into a single system.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
