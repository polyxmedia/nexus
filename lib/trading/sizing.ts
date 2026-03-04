import type { TechnicalSnapshot } from "@/lib/thesis/types";

export interface SizingTier {
  label: string;
  percentOfCash: number;
  positionValue: number;
  quantity: number;
}

export interface RiskEstimates {
  upsideTarget: number;
  upsidePercent: number;
  downsideRisk: number;
  downsidePercent: number;
  riskRewardRatio: number;
}

/**
 * Returns 3 position sizing tiers based on free cash and current price.
 * Conservative = 1%, Moderate = 2.5%, Aggressive = 5% of free cash.
 */
export function computeSizingSuggestions(
  freeCash: number,
  currentPrice: number,
  minQty = 0.001
): SizingTier[] {
  if (freeCash <= 0 || currentPrice <= 0) return [];

  const tiers = [
    { label: "Conservative", pct: 0.01 },
    { label: "Moderate", pct: 0.025 },
    { label: "Aggressive", pct: 0.05 },
  ];

  return tiers.map(({ label, pct }) => {
    const positionValue = freeCash * pct;
    const rawQty = positionValue / currentPrice;
    const quantity = Math.max(Math.floor(rawQty * 1000) / 1000, minQty);
    return {
      label,
      percentOfCash: pct * 100,
      positionValue: Math.round(positionValue * 100) / 100,
      quantity,
    };
  });
}

/**
 * Derives upside/downside targets from a TechnicalSnapshot.
 * Upside: Bollinger upper (BUY) or lower (SELL).
 * Downside: 2x ATR from current price against the trade direction.
 */
export function computeRiskEstimates(
  direction: "BUY" | "SELL",
  snapshot: TechnicalSnapshot
): RiskEstimates | null {
  const { price, bollingerBands, atr14 } = snapshot;
  if (!bollingerBands || !atr14 || price <= 0) return null;

  const upsideTarget =
    direction === "BUY" ? bollingerBands.upper : bollingerBands.lower;
  const downsideRisk =
    direction === "BUY" ? price - 2 * atr14 : price + 2 * atr14;

  const upsidePercent = ((upsideTarget - price) / price) * 100;
  const downsidePercent = ((downsideRisk - price) / price) * 100;

  const absUpside = Math.abs(upsideTarget - price);
  const absDownside = Math.abs(price - downsideRisk);
  const riskRewardRatio = absDownside > 0 ? absUpside / absDownside : 0;

  return {
    upsideTarget: Math.round(upsideTarget * 100) / 100,
    upsidePercent: Math.round(upsidePercent * 100) / 100,
    downsideRisk: Math.round(downsideRisk * 100) / 100,
    downsidePercent: Math.round(downsidePercent * 100) / 100,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
  };
}
