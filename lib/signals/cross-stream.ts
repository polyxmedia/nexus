/**
 * Cross-Stream Correlation Detector
 * ==================================
 * Detects when disparate data streams converge unexpectedly:
 * - Military activity + commodity price spikes
 * - OSINT event clusters + shipping disruptions
 * - Signal intensity spikes across multiple regions
 *
 * Fires when 3+ independent streams show correlated movement
 * within a 48-hour window.
 */

import { db, schema } from "@/lib/db";
import { desc, gte, eq, sql } from "drizzle-orm";

export interface CrossStreamAlert {
  id: string;
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  streams: Array<{
    source: string; // "osint" | "signal" | "market" | "chokepoint" | "prediction"
    detail: string;
    timestamp: string;
    magnitude: number; // 0-1 normalized
  }>;
  affectedRegions: string[];
  affectedSectors: string[];
  detectedAt: string;
  convergenceScore: number; // 0-1, higher = more streams converging
}

/**
 * Scan for cross-stream convergences in the last 48 hours.
 * Returns alerts sorted by severity.
 */
export async function detectCrossStreamConvergences(): Promise<CrossStreamAlert[]> {
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const alerts: CrossStreamAlert[] = [];

  // Gather data from all streams in parallel
  const [recentSignals, recentPredictions, osintEvents] = await Promise.all([
    // Active high-intensity signals
    db.select({
      id: schema.signals.id,
      title: schema.signals.title,
      intensity: schema.signals.intensity,
      category: schema.signals.category,
      marketSectors: schema.signals.marketSectors,
      createdAt: schema.signals.createdAt,
    }).from(schema.signals)
      .where(gte(schema.signals.createdAt, cutoff48h))
      .orderBy(desc(schema.signals.intensity))
      .catch(() => []),

    // Recent predictions with high confidence
    db.select({
      id: schema.predictions.id,
      claim: schema.predictions.claim,
      confidence: schema.predictions.confidence,
      category: schema.predictions.category,
      createdAt: schema.predictions.createdAt,
    }).from(schema.predictions)
      .where(gte(schema.predictions.createdAt, cutoff48h))
      .catch(() => []),

    // OSINT entity events
    db.select({
      id: schema.entities.id,
      name: schema.entities.name,
      properties: schema.entities.properties,
      createdAt: schema.entities.createdAt,
    }).from(schema.entities)
      .where(eq(schema.entities.type, "event"))
      .catch(() => []),
  ]);

  // Detect convergence: high-intensity signals + matching predictions in same window
  const highSignals = recentSignals.filter(s => s.intensity >= 4);
  if (highSignals.length >= 2) {
    const signalCategories = new Set(highSignals.map(s => s.category));
    const signalSectors = new Set(
      highSignals.flatMap(s => {
        try { return JSON.parse(s.marketSectors || "[]"); } catch { return []; }
      })
    );

    // Check if predictions align with signal direction
    const alignedPredictions = recentPredictions.filter(p =>
      p.confidence >= 0.6 && highSignals.some(s =>
        s.title.toLowerCase().includes(p.claim.toLowerCase().split(" ")[0]) ||
        p.claim.toLowerCase().includes(s.category)
      )
    );

    if (alignedPredictions.length > 0) {
      const streams = [
        ...highSignals.map(s => ({
          source: "signal" as const,
          detail: `${s.title} (intensity ${s.intensity}/5)`,
          timestamp: s.createdAt,
          magnitude: s.intensity / 5,
        })),
        ...alignedPredictions.map(p => ({
          source: "prediction" as const,
          detail: `${p.claim.slice(0, 100)} (${(p.confidence * 100).toFixed(0)}% confidence)`,
          timestamp: p.createdAt,
          magnitude: p.confidence,
        })),
      ];

      const convergenceScore = Math.min(1, streams.length / 6);
      alerts.push({
        id: `convergence-${Date.now()}`,
        severity: convergenceScore >= 0.7 ? "critical" : convergenceScore >= 0.5 ? "high" : "moderate",
        title: `Multi-stream convergence: ${signalCategories.size} signal categories + ${alignedPredictions.length} aligned predictions`,
        description: `${highSignals.length} high-intensity signals across ${signalCategories.size} categories with ${alignedPredictions.length} correlated predictions in the same 48-hour window.`,
        streams,
        affectedRegions: Array.from(signalCategories) as string[],
        affectedSectors: Array.from(signalSectors).map(String),
        detectedAt: new Date().toISOString(),
        convergenceScore,
      });
    }
  }

  // Detect: multiple signals in same sector within 24h
  const sectorCounts = new Map<string, number>();
  for (const s of recentSignals.filter(s => s.createdAt >= cutoff24h)) {
    try {
      const sectors = JSON.parse(s.marketSectors || "[]") as string[];
      for (const sector of sectors) {
        sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);
      }
    } catch { /* skip */ }
  }

  for (const [sector, count] of sectorCounts) {
    if (count >= 3) {
      const sectorSignals = recentSignals.filter(s => {
        try { return (JSON.parse(s.marketSectors || "[]") as string[]).includes(sector); }
        catch { return false; }
      });

      alerts.push({
        id: `sector-cluster-${sector}-${Date.now()}`,
        severity: count >= 5 ? "high" : "moderate",
        title: `${sector} sector under pressure: ${count} signals in 24h`,
        description: `${count} distinct signals affecting the ${sector} sector within 24 hours, suggesting coordinated or cascading impact.`,
        streams: sectorSignals.slice(0, 5).map(s => ({
          source: "signal",
          detail: s.title,
          timestamp: s.createdAt,
          magnitude: s.intensity / 5,
        })),
        affectedRegions: [],
        affectedSectors: [sector],
        detectedAt: new Date().toISOString(),
        convergenceScore: Math.min(1, count / 6),
      });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
}
