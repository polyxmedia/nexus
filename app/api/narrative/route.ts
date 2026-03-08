import { NextRequest, NextResponse } from "next/server";
import { getNarrativeSnapshot } from "@/lib/narrative";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") || undefined;

    const snapshot = await getNarrativeSnapshot(theme);

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
