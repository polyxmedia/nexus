import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prediction | NEXUS Intelligence",
  description:
    "AI-generated prediction with live tracking, auto-resolution, and Brier scoring. Every claim is falsifiable, every outcome is recorded.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
