import "server-only";
import { db, schema } from "@/lib/db";
import { sql, gte, eq, and, desc } from "drizzle-orm";

export interface FeatureVector {
  date: string;
  symbol?: string;
  features: Record<string, number>;
}

/**
 * Extract features from NEXUS historical data for a given date.
 */
export async function extractFeatures(date: string, symbol?: string): Promise<FeatureVector> {
  const features: Record<string, number> = {};
  const weekAgo = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthAgo = new Date(new Date(date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Signal features
  try {
    const signals = await db.select().from(schema.signals)
      .where(gte(schema.signals.createdAt, weekAgo));

    features.signal_count_7d = signals.length;
    features.signal_intensity_avg = signals.length > 0
      ? signals.reduce((s, sig) => s + sig.intensity, 0) / signals.length
      : 0;
    features.signal_intensity_max = signals.length > 0
      ? Math.max(...signals.map(s => s.intensity))
      : 0;
    features.convergence_count = signals.filter(s => s.category === "convergence").length;
  } catch {
    features.signal_count_7d = 0;
    features.signal_intensity_avg = 0;
    features.signal_intensity_max = 0;
    features.convergence_count = 0;
  }

  // Prediction accuracy features
  try {
    const resolved = await db.select().from(schema.predictions)
      .where(and(
        gte(schema.predictions.resolvedAt, monthAgo),
        eq(schema.predictions.preEvent, 1),
      ));

    features.active_predictions = resolved.length;

    const withDirection = resolved.filter(p => p.directionCorrect !== null);
    features.prediction_accuracy_30d = withDirection.length > 0
      ? withDirection.filter(p => p.directionCorrect === 1).length / withDirection.length
      : 0.5;

    features.prediction_confidence_avg = resolved.length > 0
      ? resolved.reduce((s, p) => s + p.confidence, 0) / resolved.length
      : 0.5;

    const withScore = resolved.filter(p => p.score !== null);
    features.brier_score_30d = withScore.length > 0
      ? withScore.reduce((s, p) => s + (p.score || 0), 0) / withScore.length
      : 0.5;
  } catch {
    features.active_predictions = 0;
    features.prediction_accuracy_30d = 0.5;
    features.prediction_confidence_avg = 0.5;
    features.brier_score_30d = 0.5;
  }

  return { date, symbol, features };
}

/**
 * Build a training dataset over a date range.
 */
export async function buildTrainingDataset(
  startDate: string,
  endDate: string,
  symbol?: string,
): Promise<FeatureVector[]> {
  const vectors: FeatureVector[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Sample weekly to avoid excessive queries
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    try {
      const vector = await extractFeatures(dateStr, symbol);
      vectors.push(vector);

      // Store in feature_store table
      for (const [name, value] of Object.entries(vector.features)) {
        await db.insert(schema.featureStore).values({
          date: dateStr,
          symbol: symbol || null,
          featureName: name,
          featureValue: value,
        });
      }
    } catch {
      // Skip dates with errors
    }
    current.setDate(current.getDate() + 7); // Weekly sampling
  }

  return vectors;
}

/**
 * Get the most recent feature vector.
 */
export async function getLatestFeatures(symbol?: string): Promise<FeatureVector> {
  const today = new Date().toISOString().split("T")[0];
  return extractFeatures(today, symbol);
}
