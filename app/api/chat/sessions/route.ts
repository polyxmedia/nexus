import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const sessions = db
      .select()
      .from(schema.chatSessions)
      .orderBy(desc(schema.chatSessions.updatedAt))
      .all();

    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const now = new Date().toISOString();
    const result = db
      .insert(schema.chatSessions)
      .values({ title: "New Chat", createdAt: now, updatedAt: now })
      .returning()
      .get();

    return NextResponse.json({ session: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
