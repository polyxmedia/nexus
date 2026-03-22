import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { fetchSocialIntel } from "@/lib/warroom/social-intel";
import type { SocialIntelResponse } from "@/lib/warroom/social-intel";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

export async function GET() {
  // Admin only for now while we validate
  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({
      posts: [],
      timestamp: Date.now(),
      totalCount: 0,
    } as SocialIntelResponse);
  }

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
