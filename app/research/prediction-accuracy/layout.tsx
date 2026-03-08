import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prediction Accuracy — Live Tracking and Brier Scores",
  description:
    "Live NEXUS prediction accuracy data: Brier scores, directional accuracy by signal layer, performance across time horizons, and how outcomes feed back into the detection system.",
  keywords: [
    "prediction accuracy",
    "Brier score",
    "forecasting accuracy",
    "signal prediction performance",
    "market forecast tracking",
    "geopolitical prediction",
  ],
  openGraph: {
    title: "Prediction Accuracy — NEXUS Intelligence",
    description:
      "Live accuracy tracking across all NEXUS signal layers. Brier scores, directional accuracy, and the feedback loops that make each prediction cycle sharper than the last.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prediction Accuracy — NEXUS Intelligence",
    description:
      "Live accuracy tracking. Brier scores. Directional accuracy by layer. Fully transparent prediction performance.",
  },
  alternates: {
    canonical: "/research/prediction-accuracy",
  },
};

export default function PredictionAccuracyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
