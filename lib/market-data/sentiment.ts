import type { MarketSentiment, SectorStrength } from "../thesis/types";
import { getQuote } from "./alpha-vantage";

const SECTOR_ETFS = [
  { sector: "Technology", etf: "XLK" },
  { sector: "Healthcare", etf: "XLV" },
  { sector: "Financials", etf: "XLF" },
  { sector: "Energy", etf: "XLE" },
  { sector: "Industrials", etf: "XLI" },
  { sector: "Consumer Discretionary", etf: "XLY" },
  { sector: "Consumer Staples", etf: "XLP" },
  { sector: "Utilities", etf: "XLU" },
  { sector: "Materials", etf: "XLB" },
  { sector: "Real Estate", etf: "XLRE" },
  { sector: "Communication Services", etf: "XLC" },
];

function classifyVixRegime(vix: number): MarketSentiment["vixRegime"] {
  if (vix < 15) return "complacent";
  if (vix < 20) return "normal";
  if (vix < 30) return "elevated";
  return "panic";
}

function computeFearGreed(
  vixLevel: number | null,
  sectorData: SectorStrength[]
): { score: number; label: MarketSentiment["fearGreedLabel"] } {
  let score = 50; // neutral baseline

  // VIX contribution (40% weight)
  if (vixLevel !== null) {
    // VIX 10 = extreme greed (100), VIX 40 = extreme fear (0)
    const vixScore = Math.max(0, Math.min(100, ((40 - vixLevel) / 30) * 100));
    score = score * 0.6 + vixScore * 0.4;
  }

  // Sector breadth contribution (60% weight is already in baseline)
  if (sectorData.length > 0) {
    const bullishCount = sectorData.filter((s) => s.trend === "bullish").length;
    const breadthScore = (bullishCount / sectorData.length) * 100;
    score = score * 0.6 + breadthScore * 0.4;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  let label: MarketSentiment["fearGreedLabel"];
  if (score < 20) label = "extreme_fear";
  else if (score < 40) label = "fear";
  else if (score < 60) label = "neutral";
  else if (score < 80) label = "greed";
  else label = "extreme_greed";

  return { score, label };
}

export async function getMarketSentiment(
  apiKey: string
): Promise<MarketSentiment> {
  // Fetch VIX
  let vixLevel: number | null = null;
  let vixRegime: MarketSentiment["vixRegime"] = null;
  try {
    const vixQuote = await getQuote("VIX", apiKey);
    vixLevel = vixQuote.price;
    vixRegime = classifyVixRegime(vixLevel);
  } catch {
    // VIX may not be available on all plans
  }

  // Fetch SPY as benchmark
  let spyChange = 0;
  try {
    const spyQuote = await getQuote("SPY", apiKey);
    spyChange = spyQuote.changePercent;
  } catch {
    // fallback
  }

  // Fetch sector ETFs (best effort, respect rate limits)
  const sectorRotation: SectorStrength[] = [];
  for (const { sector, etf } of SECTOR_ETFS.slice(0, 5)) {
    try {
      const quote = await getQuote(etf, apiKey);
      const relativeStrength = quote.changePercent - spyChange;
      sectorRotation.push({
        sector,
        etf,
        relativeStrength: Math.round(relativeStrength * 100) / 100,
        trend:
          quote.changePercent > 0.5
            ? "bullish"
            : quote.changePercent < -0.5
              ? "bearish"
              : "neutral",
      });
    } catch {
      // skip on rate limit
    }
  }

  const { score, label } = computeFearGreed(vixLevel, sectorRotation);

  return {
    vixLevel,
    vixRegime,
    sectorRotation,
    fearGreedComposite: score,
    fearGreedLabel: label,
    timestamp: new Date().toISOString(),
  };
}
