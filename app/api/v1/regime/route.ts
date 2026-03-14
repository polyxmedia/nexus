import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { loadRegimeState } from "@/lib/regime/store";

interface RegimeDimension {
  regime: string;
  score: number;
  confidence: number;
  [key: string]: unknown;
}

interface RegimeState {
  timestamp: string;
  volatility: RegimeDimension;
  growth: RegimeDimension;
  monetary: RegimeDimension;
  riskAppetite: RegimeDimension;
  dollar: RegimeDimension;
  commodity: RegimeDimension;
  geopolitical: RegimeDimension;
  composite: string;
  compositeScore: number;
}

export const GET = withApiAuth(async (request: NextRequest, ctx) => {
  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get("history") === "true";
  const historyLimit = Math.min(parseInt(searchParams.get("history_limit") || "30", 10), 90);

  const latest = await loadRegimeState<RegimeState>("latest");

  if (!latest) {
    return apiError("no_data", "No regime state available yet", 404);
  }

  // Strip internal inputs from each dimension for cleaner public output
  const dimensions = ["volatility", "growth", "monetary", "riskAppetite", "dollar", "commodity", "geopolitical"] as const;
  const cleanDimension = (dim: RegimeDimension) => {
    const { inputs, ...rest } = dim as RegimeDimension & { inputs?: unknown };
    return rest;
  };

  const regime: Record<string, unknown> = {
    timestamp: latest.timestamp,
    composite: latest.composite,
    compositeScore: latest.compositeScore,
  };

  for (const d of dimensions) {
    if (latest[d]) {
      regime[d] = cleanDimension(latest[d]);
    }
  }

  const result: Record<string, unknown> = { regime };

  if (includeHistory) {
    const history = await loadRegimeState<RegimeState[]>("latest:history");
    if (history) {
      result.history = history.slice(-historyLimit).map((entry) => ({
        timestamp: entry.timestamp,
        composite: entry.composite,
        compositeScore: entry.compositeScore,
        volatility: entry.volatility?.regime,
        growth: entry.growth?.regime,
        monetary: entry.monetary?.regime,
        riskAppetite: entry.riskAppetite?.regime,
        dollar: entry.dollar?.regime,
        commodity: entry.commodity?.regime,
        geopolitical: entry.geopolitical?.regime,
      }));
    } else {
      result.history = [];
    }
  }

  return apiSuccess(result, { tier: ctx.tier });
}, { minTier: "analyst", scope: "regime" });
