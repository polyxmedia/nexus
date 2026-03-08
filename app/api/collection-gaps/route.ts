import { NextResponse } from "next/server";
import { assessCoverage } from "@/lib/intelligence/collection-gaps";

export async function GET() {
  try {
    const report = await assessCoverage();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
