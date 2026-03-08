import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal Theory — Detection, Intensity, and Cross-Layer Amplification",
  description:
    "Deep dive into NEXUS signal detection logic: intensity scoring from 1 to 5, decay functions, noise floor filtering, and the non-linear amplification model that scores multi-layer convergences.",
  keywords: [
    "signal detection theory",
    "geopolitical signal scoring",
    "market signal intensity",
    "convergence amplification",
    "OSINT signal processing",
    "signal decay function",
  ],
  openGraph: {
    title: "Signal Theory — NEXUS Intelligence",
    description:
      "How NEXUS scores signal intensity, applies decay functions, and amplifies convergences across independent layers. The mathematics behind the detection engine.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Signal Theory — NEXUS Intelligence",
    description:
      "How NEXUS scores signal intensity, applies decay functions, and amplifies convergences across independent layers.",
  },
  alternates: {
    canonical: "/research/signal-theory",
  },
};

export default function SignalTheoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
