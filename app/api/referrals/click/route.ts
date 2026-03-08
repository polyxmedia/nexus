import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

// GET: Track a click on a referral link and redirect to register
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  try {
    // Increment click count
    await db
      .update(schema.referralCodes)
      .set({ clicks: sql`${schema.referralCodes.clicks} + 1` })
      .where(eq(schema.referralCodes.code, code));

    // Redirect to register with referral code
    const registerUrl = new URL("/register", request.url);
    registerUrl.searchParams.set("ref", code);
    return NextResponse.redirect(registerUrl);
  } catch {
    return NextResponse.redirect(new URL("/register", request.url));
  }
}
