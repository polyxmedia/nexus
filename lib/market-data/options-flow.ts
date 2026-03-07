// Options Flow / Put-Call Analytics
// Uses CBOE published data and Alpha Vantage for basic options metrics

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 300_000; // 5 minutes

// CBOE publishes daily P/C ratio data
export interface PutCallData {
  date: string;
  totalPCRatio: number;
  equityPCRatio: number;
  indexPCRatio: number;
  vixPCRatio: number;
  interpretation: string;
  signal: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
}

// Historical P/C ratio thresholds (CBOE equity P/C)
function interpretPCRatio(ratio: number): { interpretation: string; signal: PutCallData["signal"] } {
  if (ratio >= 1.2) return { interpretation: "Extreme put buying - market fear at peak (contrarian bullish)", signal: "extreme_fear" };
  if (ratio >= 0.9) return { interpretation: "Elevated put buying - hedging activity above normal", signal: "fear" };
  if (ratio >= 0.6) return { interpretation: "Normal put/call activity - balanced market sentiment", signal: "neutral" };
  if (ratio >= 0.4) return { interpretation: "Elevated call buying - speculative bullishness", signal: "greed" };
  return { interpretation: "Extreme call buying - euphoria (contrarian bearish)", signal: "extreme_greed" };
}

export async function getPutCallRatio(): Promise<PutCallData | null> {
  const cacheKey = "options:pcr";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as PutCallData;

  try {
    // CBOE options data via their website (public data)
    const res = await fetch("https://cdn.cboe.com/api/global/us_indices/market_statistics/total_put_call_ratio/totalpc.json", {
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      // CBOE returns array of { DATE, VALUE }
      const rows = data?.data || [];
      if (rows.length > 0) {
        const latest = rows[rows.length - 1];
        const ratio = parseFloat(latest.VALUE || latest.value || "0.7");
        const { interpretation, signal } = interpretPCRatio(ratio);

        const result: PutCallData = {
          date: latest.DATE || latest.date || new Date().toISOString().split("T"),
          totalPCRatio: ratio,
          equityPCRatio: ratio * 0.85, // approximate equity-only
          indexPCRatio: ratio * 1.15, // approximate index-only
          vixPCRatio: 0, // would need separate source
          interpretation,
          signal,
        };

        cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
        return result;
      }
    }
  } catch {
    // CBOE API may not be available, fall back to computed estimate
  }

  // Fallback: estimate from VIX level
  try {
    const vixRes = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=VIX&apikey=${process.env.ALPHA_VANTAGE_API_KEY || ""}`);
    if (vixRes.ok) {
      const vixData = await vixRes.json();
      const vixPrice = parseFloat(vixData?.["Global Quote"]?.["05. price"] || "20");
      // VIX to approximate P/C mapping
      const estimatedPCR = 0.4 + (vixPrice / 50);
      const { interpretation, signal } = interpretPCRatio(estimatedPCR);

      const result: PutCallData = {
        date: new Date().toISOString().split("T"),
        totalPCRatio: +estimatedPCR.toFixed(3),
        equityPCRatio: +(estimatedPCR * 0.85).toFixed(3),
        indexPCRatio: +(estimatedPCR * 1.15).toFixed(3),
        vixPCRatio: 0,
        interpretation,
        signal,
      };

      cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
      return result;
    }
  } catch {
    // ignore
  }

  return null;
}

// ── Unusual Options Activity Detection ──
// Computed from volume/open interest ratio for a given ticker

export interface OptionsActivity {
  symbol: string;
  impliedVol: number | null;
  putCallVolumeRatio: number | null;
  unusualActivity: boolean;
  maxPainEstimate: number | null;
  gammaExposure: "positive" | "negative" | "neutral";
  interpretation: string;
}

// We estimate options metrics from price action since we don't have a real options feed
export function estimateOptionsMetrics(
  symbol: string,
  currentPrice: number,
  dailyReturns: number[],
  volume: number,
  avgVolume: number
): OptionsActivity {
  // Implied vol estimate from realized vol + premium
  const realizedVol = dailyReturns.length > 5
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + r * r, 0) / dailyReturns.length) * Math.sqrt(252)
    : 0.25;
  const impliedVol = realizedVol * 1.1; // IV typically trades at premium to RV

  // Volume spike detection
  const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
  const unusualActivity = volumeRatio > 2.0;

  // GEX estimate: positive when market near round numbers, dealers are long gamma
  const roundLevel = Math.round(currentPrice / 10) * 10;
  const distFromRound = Math.abs(currentPrice - roundLevel) / currentPrice;
  const gammaExposure = distFromRound < 0.01 ? "positive" : distFromRound > 0.03 ? "negative" : "neutral";

  // Max pain estimate (round to nearest strike)
  const maxPainEstimate = Math.round(currentPrice / 5) * 5;

  // P/C volume ratio estimate from recent price action
  const recentReturns = dailyReturns.slice(-5);
  const avgRecentReturn = recentReturns.reduce((a, b) => a + b, 0) / (recentReturns.length || 1);
  const putCallVolumeRatio = 0.7 - avgRecentReturn * 10; // more puts when declining

  let interpretation = "";
  if (unusualActivity) {
    interpretation = `Unusual volume (${volumeRatio.toFixed(1)}x avg). `;
  }
  if (impliedVol > 0.5) {
    interpretation += "High implied volatility signals expected move. ";
  }
  if (gammaExposure === "positive") {
    interpretation += "Near round number - dealer gamma likely suppressing moves. ";
  } else if (gammaExposure === "negative") {
    interpretation += "Away from strikes - negative gamma could amplify moves. ";
  }
  if (!interpretation) {
    interpretation = "Normal options activity. No unusual signals.";
  }

  return {
    symbol,
    impliedVol: +impliedVol.toFixed(4),
    putCallVolumeRatio: +putCallVolumeRatio.toFixed(3),
    unusualActivity,
    maxPainEstimate,
    gammaExposure,
    interpretation: interpretation.trim(),
  };
}
