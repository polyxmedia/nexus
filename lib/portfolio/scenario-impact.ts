/**
 * Position Impact Simulator
 * ═════════════════════════
 * Connects game theory scenarios to portfolio positions.
 * Zero AI calls. Pure math against existing data.
 *
 * Maps geopolitical scenario market impacts → sector shocks → position P&L.
 */

import { SCENARIOS } from "@/lib/game-theory/actors";
import { analyzeScenario } from "@/lib/game-theory/analysis";
import { stressTestPortfolio, type StressScenario } from "@/lib/market-data/risk-analytics";

// ── Sector → Ticker mapping (ETF proxies for sector exposure) ──
const SECTOR_TICKERS: Record<string, string[]> = {
  energy: ["XLE", "USO", "OIH", "XOP", "CL"],
  technology: ["XLK", "QQQ", "SMH", "SOXX"],
  semiconductors: ["SMH", "SOXX", "TSM", "NVDA", "ASML"],
  defense: ["ITA", "LMT", "RTX", "NOC", "GD", "BA"],
  shipping: ["BDRY", "SBLK", "DAC", "ZIM"],
  airlines: ["JETS", "DAL", "UAL", "AAL"],
  finance: ["XLF", "KRE", "KBE"],
  healthcare: ["XLV", "IBB"],
  industrials: ["XLI"],
  consumer: ["XLY", "XLP", "XRT"],
  utilities: ["XLU"],
  materials: ["XLB"],
  "real estate": ["XLRE", "VNQ"],
  communications: ["XLC"],
  agriculture: ["DBA", "WEAT", "CORN"],
  gold: ["GLD", "GDX", "GDXJ"],
  bonds: ["TLT", "IEF", "AGG", "HYG"],
  crypto: ["BTC", "ETH", "IBIT", "BITO"],
  "emerging markets": ["EEM", "EFA", "FXI", "KWEB"],
  transport: ["IYT", "DAL", "FDX", "UPS"],
};

// Magnitude → % shock mapping
const MAGNITUDE_SHOCKS: Record<string, number> = {
  low: 0.03,
  medium: 0.07,
  high: 0.15,
};

export interface ScenarioImpact {
  scenarioId: string;
  scenarioTitle: string;
  direction: "bullish" | "bearish" | "mixed";
  confidence: number;
  mostLikelyOutcome: string;
  keySectors: string[];
  portfolioImpact: {
    totalImpactDollar: number;
    totalImpactPercent: number;
    positionImpacts: Array<{
      ticker: string;
      currentValue: number;
      shock: number;
      impactDollar: number;
      matchedSector: string | null;
    }>;
  };
  escalationLadder: Array<{
    level: number;
    description: string;
    probability: number;
    portfolioImpactPercent: number;
  }>;
}

/**
 * Convert a game theory scenario's market assessment into a stress test shock map.
 */
function scenarioToShocks(
  keySectors: string[],
  direction: "bullish" | "bearish" | "mixed",
  magnitude: string
): Record<string, number> {
  const baseMag = MAGNITUDE_SHOCKS[magnitude] || 0.07;
  const sign = direction === "bearish" ? -1 : direction === "bullish" ? 1 : -0.5;
  const shocks: Record<string, number> = {};

  for (const sector of keySectors) {
    const sectorLower = sector.toLowerCase();
    // Find matching sector tickers
    for (const [key, tickers] of Object.entries(SECTOR_TICKERS)) {
      if (sectorLower.includes(key) || key.includes(sectorLower)) {
        for (const ticker of tickers) {
          shocks[ticker] = baseMag * sign;
        }
      }
    }
  }

  // Always add broad market impact (dampened)
  if (!shocks["SPY"]) shocks["SPY"] = baseMag * sign * 0.4;
  if (!shocks["QQQ"]) shocks["QQQ"] = baseMag * sign * 0.5;

  // Safe havens move inversely during bearish scenarios
  if (direction === "bearish") {
    if (!shocks["GLD"]) shocks["GLD"] = baseMag * 0.6;
    if (!shocks["TLT"]) shocks["TLT"] = baseMag * 0.3;
  }

  return shocks;
}

/**
 * Find which sector a ticker belongs to (best effort).
 */
function findSectorForTicker(ticker: string): string | null {
  const upper = ticker.toUpperCase();
  for (const [sector, tickers] of Object.entries(SECTOR_TICKERS)) {
    if (tickers.includes(upper)) return sector;
  }
  return null;
}

/**
 * Run all game theory scenarios against a portfolio.
 * Returns impact estimates for each scenario sorted by absolute impact.
 * Zero AI calls, pure computation.
 */
export function simulateScenarioImpacts(
  positions: Array<{ ticker: string; value: number }>,
): ScenarioImpact[] {
  const portfolioValue = positions.reduce((s, p) => s + p.value, 0);
  if (portfolioValue === 0) return [];

  const results: ScenarioImpact[] = [];

  for (const scenario of SCENARIOS) {
    try {
      const analysis = analyzeScenario(scenario);
      const assessment = analysis.marketAssessment;
      if (!assessment) continue;

      // Convert scenario to shock map
      const shocks = scenarioToShocks(
        assessment.keySectors,
        assessment.direction,
        // Derive magnitude from confidence
        assessment.confidence > 0.7 ? "high" : assessment.confidence > 0.4 ? "medium" : "low"
      );

      // Run stress test
      const stressScenario: StressScenario = {
        name: scenario.title,
        description: scenario.description,
        shocks,
      };
      const stress = stressTestPortfolio(positions, stressScenario);

      // Map position impacts with sector info
      const positionImpacts = stress.positionImpacts.map((pi) => ({
        ticker: pi.ticker,
        currentValue: pi.currentValue,
        shock: pi.shock,
        impactDollar: pi.impact,
        matchedSector: findSectorForTicker(pi.ticker),
      }));

      // Escalation ladder with portfolio impact per level
      const escalation = analysis.escalationLadder.map((step) => {
        const stepShocks = scenarioToShocks(
          step.marketImpact?.sectors || assessment.keySectors,
          step.marketImpact?.direction || "bearish",
          step.marketImpact?.magnitude || "medium"
        );
        const stepStress = stressTestPortfolio(positions, {
          name: `Level ${step.level}`,
          description: step.description,
          shocks: stepShocks,
        });
        return {
          level: step.level,
          description: step.description,
          probability: step.probability,
          portfolioImpactPercent: stepStress.totalImpactPercent,
        };
      });

      results.push({
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        direction: assessment.direction,
        confidence: assessment.confidence,
        mostLikelyOutcome: assessment.mostLikelyOutcome,
        keySectors: assessment.keySectors,
        portfolioImpact: {
          totalImpactDollar: stress.totalImpact,
          totalImpactPercent: stress.totalImpactPercent,
          positionImpacts: positionImpacts
            .filter((p) => Math.abs(p.shock) > 0.001)
            .sort((a, b) => Math.abs(b.impactDollar) - Math.abs(a.impactDollar)),
        },
        escalationLadder: escalation,
      });
    } catch {
      // Skip scenarios that fail analysis
    }
  }

  // Sort by absolute portfolio impact (biggest risk first)
  return results.sort((a, b) =>
    Math.abs(b.portfolioImpact.totalImpactPercent) - Math.abs(a.portfolioImpact.totalImpactPercent)
  );
}

/**
 * Run a single custom "what if" scenario.
 * e.g., "What if oil goes to $100?" → { shocks: { CL: 0.25, XLE: 0.15, ... } }
 */
export function simulateCustomShock(
  positions: Array<{ ticker: string; value: number }>,
  name: string,
  description: string,
  shocks: Record<string, number>,
): ScenarioImpact {
  const stress = stressTestPortfolio(positions, { name, description, shocks });

  return {
    scenarioId: "custom",
    scenarioTitle: name,
    direction: stress.totalImpact > 0 ? "bullish" : "bearish",
    confidence: 1.0,
    mostLikelyOutcome: description,
    keySectors: Object.keys(shocks),
    portfolioImpact: {
      totalImpactDollar: stress.totalImpact,
      totalImpactPercent: stress.totalImpactPercent,
      positionImpacts: stress.positionImpacts
        .filter((p) => Math.abs(p.shock) > 0.001)
        .map((p) => ({ ...p, impactDollar: p.impact, matchedSector: findSectorForTicker(p.ticker) }))
        .sort((a, b) => Math.abs(b.impactDollar) - Math.abs(a.impactDollar)),
    },
    escalationLadder: [],
  };
}
