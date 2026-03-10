/**
 * Signal-to-PnL Attribution Engine
 *
 * Traces every dollar of portfolio PnL back to the signal, prediction,
 * thesis, and intelligence layer that generated it.
 *
 * The chain: Signal -> Prediction -> Thesis -> Trade -> PnL
 * The question it answers: "Why did I make (or lose) this money?"
 */

import { db, schema } from "../db";
import { eq, desc, and, isNull } from "drizzle-orm";

// ── Types ──

export interface LayerAttribution {
  layer: string;  // geopolitical | market | gameTheory | convergence | celestial | hebrew | sentiment | osint
  weight: number; // 0-1
  evidence: string;
}

export interface AttributionChain {
  positionTicker: string;
  direction: "long" | "short";
  quantity: number;
  avgCost: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  pnlPercent?: number;
  // Lineage
  tradeIds: number[];
  predictionId?: number;
  predictionClaim?: string;
  predictionConfidence?: number;
  predictionOutcome?: string;
  predictionScore?: number;
  signalId?: number;
  signalTitle?: string;
  signalIntensity?: number;
  signalCategory?: string;
  thesisId?: number;
  thesisTitle?: string;
  thesisConfidence?: number;
  // Layer breakdown
  layerAttribution: LayerAttribution[];
  // Meta
  attributionConfidence: number; // 0-1, how confident we are in this attribution chain
  attributionMethod: "direct" | "thesis_match" | "signal_match" | "inferred";
}

export interface SignalPerformanceEntry {
  signalId: number;
  signalTitle: string;
  signalIntensity: number;
  signalCategory: string;
  totalPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  bestTrade: { ticker: string; pnl: number } | null;
  worstTrade: { ticker: string; pnl: number } | null;
}

export interface AttributionReport {
  generatedAt: string;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  chains: AttributionChain[];
  layerSummary: {
    layer: string;
    attributedPnl: number;
    positionCount: number;
    avgConfidence: number;
    bestPerformer: string | null;
    worstPerformer: string | null;
  }[];
  signalPerformance: SignalPerformanceEntry[];
  unattributed: {
    ticker: string;
    pnl: number;
    reason: string;
  }[];
}

// ── Layer extraction from thesis data ──

const LAYER_NAMES = [
  "geopolitical", "market", "gameTheory", "convergence",
  "celestial", "hebrew", "sentiment", "osint",
];

function extractLayerAttribution(
  tradeSources?: string[],
  signalCategory?: string,
  thesisLayerInputs?: Record<string, unknown>,
): LayerAttribution[] {
  const layers: LayerAttribution[] = [];

  // Method 1: Direct from trade's source tags (highest confidence)
  if (tradeSources && tradeSources.length > 0) {
    const weight = 1 / tradeSources.length;
    for (const source of tradeSources) {
      const normalized = normalizeLayerName(source);
      layers.push({
        layer: normalized,
        weight,
        evidence: `Trade action sourced from ${source} layer`,
      });
    }
    return layers;
  }

  // Method 2: From signal category + thesis layer inputs
  const activeLayers: { name: string; evidence: string }[] = [];

  if (signalCategory) {
    const mapped = normalizeLayerName(signalCategory);
    activeLayers.push({ name: mapped, evidence: `Originating signal category: ${signalCategory}` });
  }

  if (thesisLayerInputs) {
    // Check which layers had active data
    if (thesisLayerInputs.celestial) {
      const cel = thesisLayerInputs.celestial as Record<string, unknown>;
      const events = cel.activeEvents as string[] | undefined;
      if (events && events.length > 0) {
        activeLayers.push({ name: "celestial", evidence: `Active celestial events: ${events.join(", ")}` });
      }
    }
    if (thesisLayerInputs.hebrew) {
      const heb = thesisLayerInputs.hebrew as Record<string, unknown>;
      const holidays = heb.activeHolidays as string[] | undefined;
      if (holidays && holidays.length > 0) {
        activeLayers.push({ name: "hebrew", evidence: `Active holidays: ${holidays.join(", ")}` });
      }
    }
    if (thesisLayerInputs.geopolitical) {
      const geo = thesisLayerInputs.geopolitical as Record<string, unknown>;
      const events = geo.activeEvents as string[] | undefined;
      const risk = geo.escalationRisk as number | undefined;
      if ((events && events.length > 0) || (risk && risk > 0.3)) {
        activeLayers.push({
          name: "geopolitical",
          evidence: `Geopolitical events active${risk ? `, escalation risk ${(risk * 100).toFixed(0)}%` : ""}`,
        });
      }
    }
    if (thesisLayerInputs.market) {
      activeLayers.push({ name: "market", evidence: "Market technicals and sentiment data" });
    }
    if (thesisLayerInputs.gameTheory) {
      const gt = thesisLayerInputs.gameTheory as Record<string, unknown>;
      const scenarios = gt.activeScenarios as string[] | undefined;
      if (scenarios && scenarios.length > 0) {
        activeLayers.push({ name: "gameTheory", evidence: `Active scenarios: ${scenarios.join(", ")}` });
      }
    }
  }

  // If we found active layers, distribute weight
  if (activeLayers.length > 0) {
    // Market always gets a base weight since all trades involve market data
    const hasMarket = activeLayers.some(l => l.name === "market");
    const marketWeight = hasMarket ? 0.3 : 0;
    const remaining = 1 - marketWeight;
    const otherLayers = activeLayers.filter(l => l.name !== "market");
    const otherWeight = otherLayers.length > 0 ? remaining / otherLayers.length : 0;

    if (hasMarket) {
      layers.push({
        layer: "market",
        weight: marketWeight,
        evidence: activeLayers.find(l => l.name === "market")!.evidence,
      });
    }
    for (const l of otherLayers) {
      layers.push({ layer: l.name, weight: otherWeight, evidence: l.evidence });
    }
    return layers;
  }

  // Method 3: Fallback - assume market-only
  return [{ layer: "market", weight: 1, evidence: "No signal/thesis attribution available; defaulting to market" }];
}

function normalizeLayerName(source: string): string {
  const lower = source.toLowerCase();
  if (lower.includes("geo") || lower === "geopolitical") return "geopolitical";
  if (lower.includes("game") || lower === "gametheory") return "gameTheory";
  if (lower.includes("converg")) return "convergence";
  if (lower.includes("celest")) return "celestial";
  if (lower.includes("hebrew") || lower.includes("calendar")) return "hebrew";
  if (lower.includes("sentiment") || lower.includes("fear")) return "sentiment";
  if (lower.includes("osint")) return "osint";
  if (lower.includes("market") || lower.includes("technical")) return "market";
  return source;
}

// ── Core Attribution Functions ──

/**
 * Build an attribution chain for a single position.
 */
export async function buildAttributionChain(
  ticker: string,
  userId?: string,
): Promise<AttributionChain | null> {
  // 1. Find the position
  const positions = userId
    ? await db.select().from(schema.manualPositions)
        .where(and(eq(schema.manualPositions.ticker, ticker), eq(schema.manualPositions.userId, userId)))
        .orderBy(desc(schema.manualPositions.createdAt))
        .limit(1)
    : await db.select().from(schema.manualPositions)
        .where(eq(schema.manualPositions.ticker, ticker))
        .orderBy(desc(schema.manualPositions.createdAt))
        .limit(1);

  if (positions.length === 0) return null;
  const position = positions[0];

  const chain: AttributionChain = {
    positionTicker: ticker,
    direction: (position.direction as "long" | "short") || "long",
    quantity: position.quantity,
    avgCost: position.avgCost,
    tradeIds: [],
    layerAttribution: [],
    attributionConfidence: 0,
    attributionMethod: "inferred",
  };

  // Calculate PnL if position is closed
  if (position.closedAt && position.closePrice) {
    const multiplier = chain.direction === "long" ? 1 : -1;
    chain.realizedPnl = (position.closePrice - position.avgCost) * position.quantity * multiplier;
    chain.currentPrice = position.closePrice;
    chain.pnlPercent = ((position.closePrice - position.avgCost) / position.avgCost) * 100 * multiplier;
  }

  // 2. Find trades for this ticker
  const trades = await db.select().from(schema.trades)
    .where(eq(schema.trades.ticker, ticker.toUpperCase()))
    .orderBy(desc(schema.trades.createdAt));

  if (trades.length > 0) {
    chain.tradeIds = trades.map(t => t.id);

    // Get the most attribution-rich trade (one with signalId or predictionId)
    const attributedTrade = trades.find(t => t.signalId || t.predictionId) || trades[0];

    // 3. Follow prediction link
    if (attributedTrade.predictionId) {
      const [prediction] = await db.select().from(schema.predictions)
        .where(eq(schema.predictions.id, attributedTrade.predictionId))
        .limit(1);

      if (prediction) {
        chain.predictionId = prediction.id;
        chain.predictionClaim = prediction.claim;
        chain.predictionConfidence = prediction.confidence;
        chain.predictionOutcome = prediction.outcome || undefined;
        chain.predictionScore = prediction.score || undefined;
        chain.attributionMethod = "direct";
        chain.attributionConfidence = 0.9;

        // Follow signal link from prediction
        if (prediction.signalId) {
          const [signal] = await db.select().from(schema.signals)
            .where(eq(schema.signals.id, prediction.signalId))
            .limit(1);

          if (signal) {
            chain.signalId = signal.id;
            chain.signalTitle = signal.title;
            chain.signalIntensity = signal.intensity;
            chain.signalCategory = signal.category;
          }
        }
      }
    }

    // 4. Follow signal link directly from trade
    if (!chain.signalId && attributedTrade.signalId) {
      const [signal] = await db.select().from(schema.signals)
        .where(eq(schema.signals.id, attributedTrade.signalId))
        .limit(1);

      if (signal) {
        chain.signalId = signal.id;
        chain.signalTitle = signal.title;
        chain.signalIntensity = signal.intensity;
        chain.signalCategory = signal.category;
        chain.attributionMethod = "signal_match";
        chain.attributionConfidence = 0.8;
      }
    }
  }

  // 5. Try to find thesis that recommended this ticker
  const activeTheses = await db.select().from(schema.theses)
    .orderBy(desc(schema.theses.generatedAt))
    .limit(10);

  for (const thesis of activeTheses) {
    try {
      const actions = JSON.parse(thesis.tradingActions) as Array<{
        ticker: string;
        direction: string;
        sources?: string[];
      }>;
      const matchingAction = actions.find(
        a => a.ticker?.toUpperCase() === ticker.toUpperCase()
      );

      if (matchingAction) {
        chain.thesisId = thesis.id;
        chain.thesisTitle = thesis.title;
        chain.thesisConfidence = thesis.overallConfidence;

        if (chain.attributionMethod === "inferred") {
          chain.attributionMethod = "thesis_match";
          chain.attributionConfidence = 0.7;
        }

        // Extract layer attribution from trading action sources + thesis layer inputs
        const layerInputs = JSON.parse(thesis.layerInputs);
        chain.layerAttribution = extractLayerAttribution(
          matchingAction.sources,
          chain.signalCategory,
          layerInputs,
        );
        break;
      }
    } catch {
      // Bad JSON, skip
    }
  }

  // 6. If no layer attribution yet, derive from signal category
  if (chain.layerAttribution.length === 0) {
    chain.layerAttribution = extractLayerAttribution(
      undefined,
      chain.signalCategory,
      undefined,
    );
  }

  return chain;
}

/**
 * Generate a full portfolio attribution report.
 */
export async function generateAttributionReport(userId?: string): Promise<AttributionReport> {
  const report: AttributionReport = {
    generatedAt: new Date().toISOString(),
    totalUnrealizedPnl: 0,
    totalRealizedPnl: 0,
    totalPnl: 0,
    chains: [],
    layerSummary: [],
    signalPerformance: [],
    unattributed: [],
  };

  // Get all positions
  const positions = userId
    ? await db.select().from(schema.manualPositions)
        .where(eq(schema.manualPositions.userId, userId))
    : await db.select().from(schema.manualPositions);

  // Build attribution chain for each position
  const seenTickers = new Set<string>();
  for (const pos of positions) {
    if (seenTickers.has(pos.ticker)) continue;
    seenTickers.add(pos.ticker);

    const chain = await buildAttributionChain(pos.ticker, userId);
    if (chain) {
      report.chains.push(chain);

      const pnl = chain.realizedPnl || chain.unrealizedPnl || 0;
      if (chain.realizedPnl) report.totalRealizedPnl += chain.realizedPnl;
      if (chain.unrealizedPnl) report.totalUnrealizedPnl += chain.unrealizedPnl;

      if (chain.attributionMethod === "inferred" && pnl !== 0) {
        report.unattributed.push({
          ticker: chain.positionTicker,
          pnl,
          reason: "No direct signal/prediction/thesis link found",
        });
      }
    }
  }

  report.totalPnl = report.totalRealizedPnl + report.totalUnrealizedPnl;

  // Compute layer summary
  const layerMap = new Map<string, {
    pnl: number;
    count: number;
    confidences: number[];
    tickers: { ticker: string; pnl: number }[];
  }>();

  for (const chain of report.chains) {
    const chainPnl = chain.realizedPnl || chain.unrealizedPnl || 0;
    for (const attr of chain.layerAttribution) {
      const existing = layerMap.get(attr.layer) || {
        pnl: 0, count: 0, confidences: [], tickers: [],
      };
      existing.pnl += chainPnl * attr.weight;
      existing.count += 1;
      existing.confidences.push(chain.attributionConfidence);
      existing.tickers.push({ ticker: chain.positionTicker, pnl: chainPnl * attr.weight });
      layerMap.set(attr.layer, existing);
    }
  }

  for (const [layer, data] of layerMap) {
    const sorted = data.tickers.sort((a, b) => b.pnl - a.pnl);
    report.layerSummary.push({
      layer,
      attributedPnl: Math.round(data.pnl * 100) / 100,
      positionCount: data.count,
      avgConfidence: data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length,
      bestPerformer: sorted.length > 0 ? sorted[0].ticker : null,
      worstPerformer: sorted.length > 0 ? sorted[sorted.length - 1].ticker : null,
    });
  }

  // Sort layer summary by absolute PnL
  report.layerSummary.sort((a, b) => Math.abs(b.attributedPnl) - Math.abs(a.attributedPnl));

  // Compute signal performance
  report.signalPerformance = await getSignalPerformance();

  return report;
}

/**
 * Get performance metrics for each signal that generated trades.
 */
export async function getSignalPerformance(): Promise<SignalPerformanceEntry[]> {
  // Get all trades with signal references
  const trades = await db.select().from(schema.trades)
    .orderBy(desc(schema.trades.createdAt));

  const signalTrades = trades.filter(t => t.signalId);

  // Group by signal
  const signalMap = new Map<number, typeof trades>();
  for (const trade of signalTrades) {
    const existing = signalMap.get(trade.signalId!) || [];
    existing.push(trade);
    signalMap.set(trade.signalId!, existing);
  }

  const entries: SignalPerformanceEntry[] = [];

  for (const [signalId, signalTradeList] of signalMap) {
    // Get signal details
    const [signal] = await db.select().from(schema.signals)
      .where(eq(schema.signals.id, signalId))
      .limit(1);

    if (!signal) continue;

    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let best: { ticker: string; pnl: number } | null = null;
    let worst: { ticker: string; pnl: number } | null = null;
    const returns: number[] = [];

    for (const trade of signalTradeList) {
      if (trade.filledPrice && trade.status === "filled") {
        // Estimate PnL from trade direction and price movement
        // For a more accurate picture, we'd need exit price
        // For now, use the filled price vs current position cost
        const positions = await db.select().from(schema.manualPositions)
          .where(eq(schema.manualPositions.ticker, trade.ticker))
          .limit(1);

        if (positions.length > 0) {
          const pos = positions[0];
          const multiplier = trade.direction === "BUY" ? 1 : -1;
          const pnl = pos.closePrice
            ? (pos.closePrice - pos.avgCost) * pos.quantity * multiplier
            : 0;

          totalPnl += pnl;
          if (pnl > 0) wins++;
          if (pnl < 0) losses++;
          if (pos.avgCost > 0) {
            returns.push((pnl / (pos.avgCost * pos.quantity)) * 100);
          }

          if (!best || pnl > best.pnl) best = { ticker: trade.ticker, pnl };
          if (!worst || pnl < worst.pnl) worst = { ticker: trade.ticker, pnl };
        }
      }
    }

    entries.push({
      signalId,
      signalTitle: signal.title,
      signalIntensity: signal.intensity,
      signalCategory: signal.category,
      totalPnl: Math.round(totalPnl * 100) / 100,
      tradeCount: signalTradeList.length,
      wins,
      losses,
      winRate: signalTradeList.length > 0 ? wins / (wins + losses || 1) : 0,
      avgReturn: returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0,
      bestTrade: best,
      worstTrade: worst,
    });
  }

  // Sort by total PnL descending
  entries.sort((a, b) => b.totalPnl - a.totalPnl);
  return entries;
}

/**
 * Get attribution data for a specific signal.
 */
export async function getSignalAttribution(signalId: number): Promise<{
  signal: { id: number; title: string; intensity: number; category: string; date: string } | null;
  predictions: Array<{
    id: number;
    claim: string;
    confidence: number;
    outcome: string | null;
    score: number | null;
  }>;
  trades: Array<{
    id: number;
    ticker: string;
    direction: string;
    filledPrice: number | null;
    status: string;
    createdAt: string;
  }>;
  theses: Array<{
    id: number;
    title: string;
    confidence: number;
    tradingActions: string[];
  }>;
  totalPnl: number;
  positionsAffected: string[];
}> {
  // Get signal
  const [signal] = await db.select().from(schema.signals)
    .where(eq(schema.signals.id, signalId))
    .limit(1);

  if (!signal) {
    return { signal: null, predictions: [], trades: [], theses: [], totalPnl: 0, positionsAffected: [] };
  }

  // Get predictions linked to this signal
  const predictions = await db.select().from(schema.predictions)
    .where(eq(schema.predictions.signalId, signalId));

  // Get trades linked to this signal
  const trades = await db.select().from(schema.trades)
    .where(eq(schema.trades.signalId, signalId));

  // Find theses that mention market sectors from this signal
  const signalSectors: string[] = signal.marketSectors ? JSON.parse(signal.marketSectors) : [];
  const allTheses = await db.select().from(schema.theses)
    .orderBy(desc(schema.theses.generatedAt))
    .limit(20);

  const relevantTheses: Array<{
    id: number;
    title: string;
    confidence: number;
    tradingActions: string[];
  }> = [];

  for (const thesis of allTheses) {
    try {
      const symbols: string[] = JSON.parse(thesis.symbols);
      const actions = JSON.parse(thesis.tradingActions) as Array<{ ticker: string; direction: string }>;

      // Check if thesis symbols overlap with signal's market sectors or if generated around signal date
      const thesisDate = new Date(thesis.generatedAt).getTime();
      const signalDate = new Date(signal.date).getTime();
      const within3Days = Math.abs(thesisDate - signalDate) < 3 * 24 * 60 * 60 * 1000;

      if (within3Days) {
        relevantTheses.push({
          id: thesis.id,
          title: thesis.title,
          confidence: thesis.overallConfidence,
          tradingActions: actions.map(a => `${a.direction} ${a.ticker}`),
        });
      }
    } catch {
      // Bad JSON
    }
  }

  // Calculate total PnL from trades linked to this signal
  let totalPnl = 0;
  const positionsAffected = new Set<string>();

  for (const trade of trades) {
    positionsAffected.add(trade.ticker);
    const positions = await db.select().from(schema.manualPositions)
      .where(eq(schema.manualPositions.ticker, trade.ticker))
      .limit(1);

    if (positions.length > 0 && positions[0].closePrice) {
      const pos = positions[0];
      const multiplier = trade.direction === "BUY" ? 1 : -1;
      totalPnl += (pos.closePrice - pos.avgCost) * pos.quantity * multiplier;
    }
  }

  return {
    signal: {
      id: signal.id,
      title: signal.title,
      intensity: signal.intensity,
      category: signal.category,
      date: signal.date,
    },
    predictions: predictions.map(p => ({
      id: p.id,
      claim: p.claim,
      confidence: p.confidence,
      outcome: p.outcome,
      score: p.score,
    })),
    trades: trades.map(t => ({
      id: t.id,
      ticker: t.ticker,
      direction: t.direction,
      filledPrice: t.filledPrice,
      status: t.status,
      createdAt: t.createdAt,
    })),
    theses: relevantTheses,
    totalPnl: Math.round(totalPnl * 100) / 100,
    positionsAffected: [...positionsAffected],
  };
}
