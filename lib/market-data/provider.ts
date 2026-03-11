/**
 * Unified market data provider.
 *
 * Primary:  Twelve Data (stocks, ETFs, crypto, forex)
 * Fallback: Alpha Vantage (same coverage, lower rate limits on free tier)
 *
 * Alpha Vantage is still imported directly by the GEX engine for
 * HISTORICAL_OPTIONS, which Twelve Data does not offer.
 */

import type { QuoteResult, DailyBar } from "./alpha-vantage";
import * as twelveData from "./twelve-data";
import * as alphaVantage from "./alpha-vantage";

export type { QuoteResult, DailyBar };

function getAVKey(): string | null {
  return process.env.ALPHA_VANTAGE_API_KEY || null;
}

function hasTwelveData(): boolean {
  return !!process.env.TWELVE_DATA_API_KEY;
}

export async function getQuote(
  symbol: string,
  apiKey?: string
): Promise<QuoteResult> {
  // Try Twelve Data first
  if (hasTwelveData()) {
    try {
      return await twelveData.getQuote(symbol);
    } catch (err) {
      console.warn(`[provider] Twelve Data quote failed for ${symbol}, falling back to AV:`, (err as Error).message);
    }
  }

  // Fallback to Alpha Vantage
  const avKey = apiKey || getAVKey();
  if (!avKey) throw new Error("No market data API key available (set TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY)");
  return alphaVantage.getQuote(symbol, avKey);
}

export async function getDailySeries(
  symbol: string,
  apiKey?: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  if (hasTwelveData()) {
    try {
      return await twelveData.getDailySeries(symbol, outputSize);
    } catch (err) {
      console.warn(`[provider] Twelve Data daily failed for ${symbol}, falling back to AV:`, (err as Error).message);
    }
  }

  const avKey = apiKey || getAVKey();
  if (!avKey) throw new Error("No market data API key available (set TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY)");
  return alphaVantage.getDailySeries(symbol, avKey, outputSize);
}

export async function getForexDailySeries(
  fromCurrency: string,
  toCurrency: string,
  apiKey?: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  if (hasTwelveData()) {
    try {
      return await twelveData.getForexDailySeries(fromCurrency, toCurrency, outputSize);
    } catch (err) {
      console.warn(`[provider] Twelve Data forex failed for ${fromCurrency}/${toCurrency}, falling back to AV:`, (err as Error).message);
    }
  }

  const avKey = apiKey || getAVKey();
  if (!avKey) throw new Error("No market data API key available (set TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY)");
  return alphaVantage.getForexDailySeries(fromCurrency, toCurrency, avKey, outputSize);
}

export async function searchSymbol(
  query: string,
  apiKey?: string
): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
  if (hasTwelveData()) {
    try {
      return await twelveData.searchSymbol(query);
    } catch (err) {
      console.warn(`[provider] Twelve Data search failed for "${query}", falling back to AV:`, (err as Error).message);
    }
  }

  const avKey = apiKey || getAVKey();
  if (!avKey) throw new Error("No market data API key available (set TWELVE_DATA_API_KEY or ALPHA_VANTAGE_API_KEY)");
  return alphaVantage.searchSymbol(query, avKey);
}
