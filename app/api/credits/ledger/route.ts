import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name;

  const entries = await db
    .select()
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, username))
    .orderBy(desc(schema.creditLedger.createdAt))
    .limit(100);

  return NextResponse.json(entries);
}
