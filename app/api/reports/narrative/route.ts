import { NextResponse } from "next/server";
import { generateNarrativeReport } from "@/lib/reports/narrative";
import { creditGate } from "@/lib/credits/gate";
import { getSettingValue } from "@/lib/settings/get-setting";
import { validateOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;
    const body = await request.json();
    const topic = body.topic || null;

    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const report = await generateNarrativeReport(topic, apiKey);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Narrative report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
