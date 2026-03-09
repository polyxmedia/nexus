import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";

const VALID_CHOKEPOINTS = ["hormuz", "suez", "malacca", "mandeb", "panama"];

async function getSubscriptions(username: string): Promise<string[]> {
  const rows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `${username}:chokepoint_alerts`));
  if (rows.length === 0) return [];
  try { return JSON.parse(rows[0].value); } catch { return []; }
}

async function saveSubscriptions(username: string, chokepoints: string[]): Promise<void> {
  const key = `${username}:chokepoint_alerts`;
  const value = JSON.stringify(chokepoints);
  await db.insert(schema.settings).values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

// GET - return user's chokepoint alert subscriptions
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const subscriptions = await getSubscriptions(tierCheck.result.username);
  return NextResponse.json({ subscriptions });
}

// POST - subscribe to a chokepoint
export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const body = await req.json();
  const { chokepointId } = body as { chokepointId?: string };

  if (!chokepointId || !VALID_CHOKEPOINTS.includes(chokepointId)) {
    return NextResponse.json({ error: "Invalid chokepointId" }, { status: 400 });
  }

  const username = tierCheck.result.username;
  const current = await getSubscriptions(username);

  if (current.includes(chokepointId)) {
    return NextResponse.json({ subscriptions: current });
  }

  current.push(chokepointId);
  await saveSubscriptions(username, current);

  return NextResponse.json({ subscriptions: current });
}

// DELETE - unsubscribe from a chokepoint
export async function DELETE(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const body = await req.json();
  const { chokepointId } = body as { chokepointId?: string };

  if (!chokepointId) {
    return NextResponse.json({ error: "chokepointId required" }, { status: 400 });
  }

  const username = tierCheck.result.username;
  const current = await getSubscriptions(username);
  const updated = current.filter((c) => c !== chokepointId);
  await saveSubscriptions(username, updated);

  return NextResponse.json({ subscriptions: updated });
}
