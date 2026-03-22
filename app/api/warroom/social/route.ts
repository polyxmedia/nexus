import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { fetchSocialIntel } from "@/lib/warroom/social-intel";
import type { SocialIntelResponse } from "@/lib/warroom/social-intel";

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const posts = await fetchSocialIntel();

    const response: SocialIntelResponse = {
      posts,
      timestamp: Date.now(),
      totalCount: posts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Social Intel] API error:", error);
    return NextResponse.json({
      posts: [],
      timestamp: Date.now(),
      totalCount: 0,
    } as SocialIntelResponse);
  }
}
