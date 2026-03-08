import { Metadata } from "next";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Prediction Accuracy — Live Tracking and Brier Scores",
  description:
    "Live NEXUS prediction accuracy data: Brier scores, calibration analysis, BIN decomposition, directional accuracy by signal layer, performance across time horizons, and how outcomes feed back into the detection system. Updated in real-time.",
  keywords: [
    "prediction accuracy",
    "Brier score",
    "forecasting accuracy",
    "signal prediction performance",
    "market forecast tracking",
    "geopolitical prediction",
    "calibration analysis",
    "prediction tracking live",
  ],
  openGraph: {
    title: "Prediction Accuracy — Live Data | NEXUS Intelligence",
    description:
      "Live accuracy tracking across all NEXUS signal layers. Brier scores, calibration analysis, BIN decomposition, and the feedback loops that make each prediction cycle sharper. Updated in real-time from the live database.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prediction Accuracy — Live Data | NEXUS Intelligence",
    description:
      "Live accuracy tracking. Brier scores. Calibration analysis. Fully transparent prediction performance updated in real-time.",
  },
  alternates: {
    canonical: "/research/prediction-accuracy",
  },
};

export default function PredictionAccuracyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research/methodology" },
        { name: "Prediction Accuracy", url: "/research/prediction-accuracy" },
      ]} />
      <ArticleJsonLd
        title="Prediction Accuracy — Live Tracking and Brier Scores"
        description="Live NEXUS prediction accuracy data: Brier scores, calibration analysis, BIN decomposition, directional accuracy by signal layer, and performance across time horizons. Updated in real-time."
        url="/research/prediction-accuracy"
        datePublished="2025-01-01"
      />
      {children}
    </>
  );
}
