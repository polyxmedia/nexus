import { NextRequest, NextResponse } from "next/server";
import { getAllSourceProfiles, getSourcesBySpecialty, getSourcesByReliability, type SourceReliability } from "@/lib/sources/reliability";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");
    const reliability = searchParams.get("reliability");

    let sources = getAllSourceProfiles();

    if (specialty) {
      sources = getSourcesBySpecialty(specialty);
    }

    if (reliability) {
      const levels = reliability.split(",") as SourceReliability[];
      sources = sources.filter(s => levels.includes(s.reliability));
    }

    return NextResponse.json({ sources, count: sources.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
