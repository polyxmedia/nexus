import { NextResponse } from "next/server";
import { getAIProgressionSnapshot } from "@/lib/ai-progression";

export async function GET() {
  try {
    const snapshot = await getAIProgressionSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("AI Progression API error:", error);
    return NextResponse.json({
      rli: null,
      metr: null,
      ai2027: null,
      sectors: [],
      displacement: null,
      compositeScore: 0,
      regime: "nascent",
    });
  }
}
