import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automation Rules | NEXUS",
  description: "IF-THEN intelligence automation: trigger actions when signals, predictions, sentiment, or prices cross thresholds",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
