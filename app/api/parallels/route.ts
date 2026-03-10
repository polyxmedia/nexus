import { NextResponse } from "next/server";
import { findHistoricalParallels } from "@/lib/parallels/engine";
import { creditGate } from "@/lib/credits/gate";
import { getSettingValue } from "@/lib/settings/get-setting";

export async function POST(request: Request) {
  try {
    const gate = await creditGate();
    if (gate.response) return gate.response;
    const { query } = await request.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query string is required" },
        { status: 400 }
      );
    }

    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const result = await findHistoricalParallels(query, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Parallels API error:", error);
    return NextResponse.json(
      { error: "Failed to find historical parallels" },
      { status: 500 }
    );
  }
}
