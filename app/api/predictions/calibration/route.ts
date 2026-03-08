import { NextResponse } from "next/server";
import { computePerformanceReport } from "@/lib/predictions/feedback";

export async function GET() {
  try {
    const report = await computePerformanceReport();

    if (!report) {
      return NextResponse.json({
        ready: false,
        message: "Not enough resolved predictions for calibration analysis (minimum 5 required)",
      });
    }

    // Generate human-readable insights
    const insights: string[] = [];

    // Calibration direction
    if (report.calibrationGap > 0.1) {
      insights.push(
        `Overconfident: you state ${(report.avgConfidence * 100).toFixed(0)}% average confidence but only ${(report.binaryAccuracy * 100).toFixed(0)}% confirm. Lower confidence by ~${(report.calibrationGap * 50).toFixed(0)}pp.`
      );
    } else if (report.calibrationGap < -0.1) {
      insights.push(
        `Underconfident: predictions confirm at ${(report.binaryAccuracy * 100).toFixed(0)}% but you only state ${(report.avgConfidence * 100).toFixed(0)}% confidence. You could increase by ~${(Math.abs(report.calibrationGap) * 50).toFixed(0)}pp.`
      );
    } else {
      insights.push("Calibration is within acceptable range. Maintain current confidence approach.");
    }

    // Category insights
    for (const cat of report.byCategory) {
      if (!cat.reliable) continue;
      if (cat.brierScore > 0.35) {
        insights.push(`${cat.category} predictions are poorly calibrated (Brier ${cat.brierScore.toFixed(3)}). Consider avoiding or reducing confidence.`);
      } else if (cat.brierScore < 0.15) {
        insights.push(`${cat.category} predictions are well calibrated (Brier ${cat.brierScore.toFixed(3)}). This is a strength.`);
      }
      if (cat.calibrationGap > 0.15) {
        insights.push(`Overconfident on ${cat.category}: stated ~${(cat.avgConfidence * 100).toFixed(0)}% but ${((cat.avgConfidence - cat.calibrationGap) * 100).toFixed(0)}% hit rate.`);
      }
    }

    // Timeframe insights
    const timeframes = Object.entries(report.timeframeAccuracy);
    const reliableTf = timeframes.filter(([, v]) => v.reliable);
    if (reliableTf.length >= 2) {
      reliableTf.sort(([, a], [, b]) => a.brierScore - b.brierScore);
      const best = reliableTf[0];
      const worst = reliableTf[reliableTf.length - 1];
      if (worst[1].brierScore - best[1].brierScore > 0.1) {
        insights.push(`${best[0]} predictions perform best (Brier ${best[1].brierScore.toFixed(3)}). ${worst[0]} predictions are weakest (Brier ${worst[1].brierScore.toFixed(3)}).`);
      }
    }

    // Trend
    if (report.recentTrend) {
      if (report.recentTrend.improving) {
        insights.push(`Improving: recent Brier ${report.recentTrend.recentBrier.toFixed(3)} vs prior ${report.recentTrend.priorBrier.toFixed(3)}.`);
      } else {
        insights.push(`Declining: recent Brier ${report.recentTrend.recentBrier.toFixed(3)} vs prior ${report.recentTrend.priorBrier.toFixed(3)}.`);
      }
    }

    // Resolution bias
    if (report.resolutionBias.biasWarning) {
      insights.push(report.resolutionBias.biasWarning);
    }

    return NextResponse.json({
      ready: true,
      totalResolved: report.totalResolved,
      sampleSufficient: report.sampleSufficient,
      brierScore: report.brierScore,
      logLoss: report.logLoss,
      binaryAccuracy: report.binaryAccuracy,
      avgConfidence: report.avgConfidence,
      calibrationGap: report.calibrationGap,
      calibration: report.calibration,
      byCategory: report.byCategory,
      timeframeAccuracy: report.timeframeAccuracy,
      recentTrend: report.recentTrend,
      failurePatterns: report.failurePatterns,
      insights,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
