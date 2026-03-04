import type { OHLCV, TechnicalSnapshot } from "../thesis/types";

// ── Simple Moving Average ──

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// ── Exponential Moving Average ──

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

// ── RSI (Relative Strength Index) ──

export function rsi(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Smoothed RSI
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── MACD ──

export function macd(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { line: number; signal: number; histogram: number } | null {
  if (closes.length < slow + signal) return null;

  // Build MACD line series
  const macdLine: number[] = [];
  for (let i = slow; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const fastEma = ema(slice, fast);
    const slowEma = ema(slice, slow);
    if (fastEma !== null && slowEma !== null) {
      macdLine.push(fastEma - slowEma);
    }
  }

  if (macdLine.length < signal) return null;

  const signalLine = ema(macdLine, signal);
  if (signalLine === null) return null;

  const currentMacd = macdLine[macdLine.length - 1];
  return {
    line: currentMacd,
    signal: signalLine,
    histogram: currentMacd - signalLine,
  };
}

// ── Bollinger Bands ──

export function bollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const middle = sma(closes, period);
  if (middle === null) return null;

  const slice = closes.slice(-period);
  const variance =
    slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDevMultiplier * stdDev,
    middle,
    lower: middle - stdDevMultiplier * stdDev,
  };
}

// ── Average True Range ──

export function atr(data: OHLCV[], period: number = 14): number | null {
  if (data.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // Initial ATR is simple average
  let atrValue =
    trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Smoothed ATR
  for (let i = period; i < trueRanges.length; i++) {
    atrValue = (atrValue * (period - 1) + trueRanges[i]) / period;
  }

  return atrValue;
}

// ── Compute Full Technical Snapshot ──

export function computeTechnicalSnapshot(
  symbol: string,
  data: OHLCV[]
): TechnicalSnapshot {
  const closes = data.map((d) => d.close);
  const latestPrice = closes[closes.length - 1] || 0;

  const rsi14 = rsi(closes, 14);
  const macdResult = macd(closes, 12, 26, 9);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const bb = bollingerBands(closes, 20, 2);
  const atr14 = atr(data, 14);

  // Determine trend
  let trend: TechnicalSnapshot["trend"] = "neutral";
  if (sma20 !== null && sma50 !== null) {
    if (latestPrice > sma20 && sma20 > sma50) trend = "bullish";
    else if (latestPrice < sma20 && sma20 < sma50) trend = "bearish";
  }

  // Determine momentum
  let momentum: TechnicalSnapshot["momentum"] = "weak";
  if (rsi14 !== null && macdResult !== null) {
    if (rsi14 > 60 && macdResult.histogram > 0) momentum = "strong";
    else if (rsi14 > 40 && rsi14 < 60) momentum = "moderate";
    else if (
      (rsi14 > 50 && macdResult.histogram < 0) ||
      (rsi14 < 50 && macdResult.histogram > 0)
    ) {
      momentum = "divergent";
    }
  }

  // Determine volatility regime
  let volatilityRegime: TechnicalSnapshot["volatilityRegime"] = "normal";
  if (atr14 !== null && sma20 !== null && sma20 > 0) {
    const atrPercent = (atr14 / latestPrice) * 100;
    if (atrPercent < 1) volatilityRegime = "low";
    else if (atrPercent < 2) volatilityRegime = "normal";
    else if (atrPercent < 4) volatilityRegime = "high";
    else volatilityRegime = "extreme";
  }

  return {
    symbol,
    timestamp: new Date().toISOString(),
    price: latestPrice,
    rsi14,
    macd: macdResult,
    sma20,
    sma50,
    sma200,
    bollingerBands: bb,
    atr14,
    trend,
    momentum,
    volatilityRegime,
  };
}
