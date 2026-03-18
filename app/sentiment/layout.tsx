import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social Sentiment | NEXUS",
  description: "Multi-source social sentiment aggregation with credibility scoring and dataset poisoning detection",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
