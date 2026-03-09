import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

// GET /r/:code — clean referral redirect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  try {
    await db
      .update(schema.referralCodes)
      .set({ clicks: sql`${schema.referralCodes.clicks} + 1` })
      .where(eq(schema.referralCodes.code, code));

    const registerUrl = new URL("/register", request.url);
    registerUrl.searchParams.set("ref", code);
    return NextResponse.redirect(registerUrl);
  } catch {
    return NextResponse.redirect(new URL("/register", request.url));
  }
}
