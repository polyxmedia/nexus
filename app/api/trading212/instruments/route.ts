import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Trading212Client, type Environment } from "@/lib/trading212/client";

// Cache instruments in memory (they rarely change)
let cachedInstruments: unknown[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const apiKeySetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "t212_api_key"))
      .get();

    const apiSecretSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "t212_api_secret"))
      .get();

    const apiKey = apiKeySetting?.value || process.env.TRADING212_API_KEY;
    const apiSecret = apiSecretSetting?.value || process.env.TRADING212_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Trading212 API key and secret not configured" },
        { status: 400 }
      );
    }

    const envSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "trading_environment"))
      .get();

    const environment = (envSetting?.value || "live") as Environment;

    const now = Date.now();
    if (!cachedInstruments || now - cacheTimestamp > CACHE_TTL_MS) {
      const client = new Trading212Client(apiKey, apiSecret, environment);
      cachedInstruments = await client.getInstruments() as unknown[];
      cacheTimestamp = now;
    }

    return NextResponse.json(cachedInstruments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
