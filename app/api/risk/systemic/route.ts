import { NextResponse } from "next/server";
import { computeSystemicRisk, getLatestSystemicRisk, getSystemicRiskHistory } from "@/lib/risk/systemic";
import { requireTier } from "@/lib/auth/require-tier";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const latest = await getLatestSystemicRisk();
    const history = await getSystemicRiskHistory();
    return NextResponse.json({ current: latest, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const result = await computeSystemicRisk();
    const history = await getSystemicRiskHistory();
    return NextResponse.json({ current: result, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
