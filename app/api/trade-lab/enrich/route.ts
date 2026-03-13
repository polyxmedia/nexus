import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getQuoteData, getHistoricalData } from "@/lib/market-data/yahoo";
import { computeTechnicalSnapshot } from "@/lib/market-data/indicators";
import { getGEXSnapshot } from "@/lib/gex";
import { detectCurrentRegime } from "@/lib/regime/detection";
import { getLatestSystemicRisk, computeSystemicRisk } from "@/lib/risk/systemic";
import { getLatestCorrelations, computeCorrelationMatrix } from "@/lib/regime/correlations";
import { getGPRSnapshot } from "@/lib/gpr";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    // Fetch everything in parallel
    const [quote, history, gex, regime, systemic, correlations, gpr] = await Promise.allSettled([
      getQuoteData(ticker),
      getHistoricalData(ticker, "6mo"),
      getGEXSnapshot(ticker).catch(() => null),
      detectCurrentRegime(),
      getLatestSystemicRisk().then(r => r || computeSystemicRisk()),
      getLatestCorrelations().then(r => r || computeCorrelationMatrix()),
      getGPRSnapshot().catch(() => null),
    ]);

    // Technical snapshot from history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let technicals: any = null;
    const historyData = history.status === "fulfilled" ? history.value : null;
    if (historyData && historyData.length > 20) {
      const ohlcv = historyData.map(b => ({
        date: b.date || "",
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      }));
      technicals = computeTechnicalSnapshot(ticker, ohlcv);
    }

    // Compute historical daily returns for Monte Carlo
    let dailyReturns: number[] = [];
    if (historyData && historyData.length > 10) {
      for (let i = 1; i < historyData.length; i++) {
        const ret = (historyData[i].close - historyData[i - 1].close) / historyData[i - 1].close;
        dailyReturns.push(ret);
      }
    }

    // Monte Carlo: 10k paths, extract percentiles at 5/10/20/30/60/90 day horizons
    const quoteData = quote.status === "fulfilled" ? quote.value : null;
    const currentPrice = quoteData?.price || (historyData && historyData.length > 0 ? historyData[historyData.length - 1].close : 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let monteCarlo: any = null;

    if (dailyReturns.length > 20 && currentPrice > 0) {
      const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
      const vol = Math.sqrt(variance);

      const horizons = [5, 10, 20, 30, 60, 90];
      const nSims = 5000;
      const distributions: Record<number, { p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number }> = {};

      for (const days of horizons) {
        const endPrices: number[] = [];
        for (let sim = 0; sim < nSims; sim++) {
          let price = currentPrice;
          for (let d = 0; d < days; d++) {
            // Geometric Brownian Motion with sampled returns
            const randomReturn = dailyReturns[Math.floor(Math.random() * dailyReturns.length)];
            price *= (1 + randomReturn);
          }
          endPrices.push(price);
        }
        endPrices.sort((a, b) => a - b);
        const pct = (p: number) => endPrices[Math.floor(p * endPrices.length)];
        distributions[days] = {
          p5: pct(0.05),
          p10: pct(0.10),
          p25: pct(0.25),
          p50: pct(0.50),
          p75: pct(0.75),
          p90: pct(0.90),
          p95: pct(0.95),
        };
      }

      monteCarlo = {
        currentPrice,
        annualizedVol: vol * Math.sqrt(252),
        dailyVol: vol,
        meanDailyReturn: mean,
        distributions,
      };
    }

    // Extract GEX levels if available
    const gexData = gex.status === "fulfilled" ? gex.value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gexLevels: any = null;
    if (gexData) {
      // Try to find the ticker's summary, or fall back to SPY
      const summary = gexData.summaries?.find(
        (s: { ticker: string }) => s.ticker === ticker
      ) || gexData.summaries?.[0];
      if (summary) {
        gexLevels = {
          ticker: summary.ticker,
          spotPrice: summary.spotPrice,
          netGEX: summary.netGEX,
          regime: summary.regime,
          putWall: summary.putWall,
          callWall: summary.callWall,
          zeroGammaLevel: summary.zeroGammaLevel,
          dealerBias: summary.dealerPositionBias,
          impliedMove1Day: summary.impliedMove1Day,
          triggerLevels: summary.triggerLevels?.slice(0, 5),
        };
      }
    }

    // Extract regime
    const regimeData = regime.status === "fulfilled" ? regime.value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let regimeSummary: any = null;
    if (regimeData) {
      regimeSummary = {
        composite: regimeData.composite,
        compositeScore: regimeData.compositeScore,
        label: regimeData.composite, // composite IS the label string
        volatility: { regime: regimeData.volatility.regime, score: regimeData.volatility.score },
        growth: { regime: regimeData.growth.regime, direction: regimeData.growth.direction },
        riskAppetite: { regime: regimeData.riskAppetite.regime, score: regimeData.riskAppetite.score },
        monetary: { regime: regimeData.monetary.regime, direction: regimeData.monetary.direction },
        geopolitical: regimeData.geopolitical ? {
          regime: regimeData.geopolitical.regime,
          score: regimeData.geopolitical.score,
          gprComposite: regimeData.geopolitical.gprComposite,
          hotRegion: regimeData.geopolitical.hotRegion,
        } : null,
      };
    }

    // Extract systemic risk
    const systemicData = systemic.status === "fulfilled" ? systemic.value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let systemicSummary: any = null;
    if (systemicData) {
      systemicSummary = {
        compositeStress: systemicData.compositeStress,
        regime: systemicData.regime,
        absorptionRatio: systemicData.absorptionRatio,
        turbulenceIndex: systemicData.turbulenceIndex,
        turbulencePercentile: systemicData.turbulencePercentile,
        interpretation: systemicData.interpretation,
        warnings: systemicData.warnings,
      };
    }

    // Extract correlation breaks
    const corrData = correlations.status === "fulfilled" ? correlations.value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let correlationBreaks: any = null;
    if (corrData) {
      correlationBreaks = {
        overallStress: corrData.overallStress,
        breaks: corrData.breaks?.slice(0, 5)?.map((b: any) => ({
          pair: b.pair,
          deviation: b.deviation,
          interpretation: b.interpretation,
        })),
      };
    }

    // Extract GPR
    const gprData = gpr.status === "fulfilled" ? gpr.value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gprSummary: any = null;
    if (gprData) {
      gprSummary = {
        composite: gprData.current?.composite,
        threatsIndex: gprData.current?.threats,
        actsIndex: gprData.current?.acts,
        thresholdCrossings: gprData.thresholdCrossings?.slice(0, 3),
        regions: gprData.regional?.map((r: { region: string; score: number; trend: string }) => ({
          region: r.region,
          score: r.score,
          trend: r.trend,
        })),
      };
    }

    return NextResponse.json({
      ticker,
      quote: quoteData ? {
        price: quoteData.price,
        change: quoteData.change,
        changePercent: quoteData.changePercent,
        volume: quoteData.volume,
        high52w: quoteData.high52w,
        low52w: quoteData.low52w,
        marketCap: quoteData.marketCap,
      } : null,
      technicals: technicals ? {
        trend: technicals.trend,
        momentum: technicals.momentum,
        volatilityRegime: technicals.volatilityRegime,
        rsi: technicals.rsi,
        macd: technicals.macd,
        bollingerBands: technicals.bollingerBands,
        atr: technicals.atr,
        sma20: technicals.sma20,
        sma50: technicals.sma50,
        sma200: technicals.sma200,
      } : null,
      monteCarlo,
      gex: gexLevels,
      regime: regimeSummary,
      systemic: systemicSummary,
      correlations: correlationBreaks,
      gpr: gprSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
