import { NextResponse } from "next/server";
import { generateNowcast, getLatestNowcast } from "@/lib/nowcast/engine";

export async function GET() {
  try {
    const latest = await getLatestNowcast();
    return NextResponse.json(latest || { error: "No nowcast available. Trigger POST to generate." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const report = await generateNowcast();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
