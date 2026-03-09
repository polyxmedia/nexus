import { NextResponse } from "next/server";
import { Trading212Client } from "@/lib/trading212/client";
import { computePortfolioRisk, STRESS_SCENARIOS, stressTestPortfolio } from "@/lib/market-data/risk-analytics";
import { requireTier } from "@/lib/auth/require-tier";
import { getSettingValue } from "@/lib/settings/get-setting";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const apiKey = await getSettingValue("t212_api_key", process.env.TRADING212_API_KEY);
    const apiSecret = await getSettingValue("t212_api_secret", process.env.TRADING212_SECRET);

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Trading 212 credentials not configured" }, { status: 500 });
    }

    const envValue = await getSettingValue("t212_environment");
    const environment = (envValue || "live") as "demo" | "live";

    const client = new Trading212Client(apiKey, apiSecret, environment);

    // Fetch account and positions
    const account = await client.getAccountCash() as Record<string, number>;
    const positions = await client.getPositions() as Array<Record<string, unknown>>;

    const portfolioValue = account.total || 0;

    if (!positions || positions.length === 0) {
      return NextResponse.json({
        error: null,
        portfolioValue,
        positions: [],
        risk: null,
        message: "No open positions to analyze",
      });
    }

    // Map positions for risk analysis
    const positionData = positions.map((p) => ({
      ticker: (p.ticker as string) || "",
      value: (p.currentPrice as number || 0) * (p.quantity as number || 0),
      quantity: (p.quantity as number) || 0,
    }));

    const risk = await computePortfolioRisk(positionData, portfolioValue);

    return NextResponse.json({
      portfolioValue,
      positionCount: positions.length,
      risk: {
        var95_1d: +risk.var95.var1d.toFixed(2),
        var95_10d: +risk.var95.var10d.toFixed(2),
        cvar95_1d: +risk.var95.cvar1d.toFixed(2),
        var99_1d: +risk.var99.var1d.toFixed(2),
        parametricVar_1d: +risk.parametricVar.var1d.toFixed(2),
        beta: risk.beta != null ? +risk.beta.toFixed(3) : null,
        sharpe: risk.sharpeData ? +risk.sharpeData.sharpe.toFixed(3) : null,
        annualizedReturn: risk.sharpeData ? +(risk.sharpeData.annualizedReturn * 100).toFixed(2) : null,
        annualizedVol: risk.sharpeData ? +(risk.sharpeData.annualizedVol * 100).toFixed(2) : null,
      },
      correlation: risk.correlation,
      stressTests: risk.stressTests.map(st => ({
        scenario: st.scenario,
        totalImpact: +st.totalImpact.toFixed(2),
        totalImpactPercent: +st.totalImpactPercent.toFixed(2),
        positionImpacts: st.positionImpacts.map(pi => ({
          ...pi,
          impact: +pi.impact.toFixed(2),
          shock: +(pi.shock * 100).toFixed(1),
        })),
      })),
      concentrationRisk: risk.concentrationRisk.map(c => ({
        ticker: c.ticker,
        weight: +(c.weight * 100).toFixed(2),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
