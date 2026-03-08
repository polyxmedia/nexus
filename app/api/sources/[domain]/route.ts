import { NextRequest, NextResponse } from "next/server";
import { getSourceProfile, assessInformation, formatAdmiraltyRating } from "@/lib/sources/reliability";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const profile = getSourceProfile(domain);
    const info = assessInformation([domain]);

    return NextResponse.json({
      ...profile,
      admiraltyRating: formatAdmiraltyRating(profile.reliability, info.accuracy),
      informationAccuracy: info.accuracy,
      accuracyExplanation: info.explanation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
