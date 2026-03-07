import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const SENSITIVE_KEYS = [
  "anthropic_api_key",
  "t212_api_key",
  "t212_api_secret",
  "alpha_vantage_api_key",
  "coinbase_api_key",
  "coinbase_api_secret",
  "fred_api_key",
  "acled_api_key",
  "acled_email",
  "voyage_api_key",
];

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key)) {
    if (value.length <= 4) return "****";
    return "****" + value.slice(-4);
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const allSettings = await db.select().from(schema.settings);

    const masked = allSettings.map((s) => ({
      ...s,
      value: maskValue(s.key, s.value),
    }));

    return NextResponse.json(masked);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await db.delete(schema.settings).where(eq(schema.settings.key, key));

    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "key and value are required" },
        { status: 400 }
      );
    }

    const existingRows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));

    if (existingRows.length > 0) {
      await db.update(schema.settings).set({ value, updatedAt: new Date().toISOString() }).where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value, updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
