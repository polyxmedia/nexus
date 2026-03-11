import { NextRequest, NextResponse } from "next/server";
import { runMonteCarloSimulation, type Scenario } from "@/lib/simulation/monte-carlo";
import { presets } from "@/lib/simulation/presets";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

// POST - run simulation
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const body = await req.json();
    const {
      currentPrice,
      scenarios,
      daysToSimulate = 30,
      numPaths = 5000,
      leverageMultiplier = 1,
      presetId,
    } = body;

    let scenarioList: Scenario[] = scenarios;

    // Use preset if specified
    if (presetId && !scenarios) {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) {
        return NextResponse.json({ error: `Preset "${presetId}" not found` }, { status: 400 });
      }
      scenarioList = preset.scenarios;
    }

    if (!currentPrice || !scenarioList || scenarioList.length === 0) {
      return NextResponse.json(
        { error: "currentPrice and scenarios (or presetId) required" },
        { status: 400 }
      );
    }

    // Validate probabilities sum to ~1
    const probSum = scenarioList.reduce((s: number, sc: Scenario) => s + sc.probability, 0);
    if (Math.abs(probSum - 1.0) > 0.05) {
      return NextResponse.json(
        { error: `Scenario probabilities must sum to 1.0 (got ${probSum.toFixed(3)})` },
        { status: 400 }
      );
    }

    const result = runMonteCarloSimulation({
      currentPrice,
      scenarios: scenarioList,
      daysToSimulate: Math.min(365, Math.max(1, daysToSimulate)),
      numPaths: Math.min(20000, Math.max(100, numPaths)),
      leverageMultiplier: Math.max(1, leverageMultiplier),
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - list preset scenario sets
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  return NextResponse.json({
    presets: presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      scenarioCount: p.scenarios.length,
      scenarios: p.scenarios.map((s) => ({ name: s.name, probability: s.probability })),
    })),
  });
}
