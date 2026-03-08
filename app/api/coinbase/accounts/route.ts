import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CoinbaseClient } from "@/lib/coinbase/client";

async function getCoinbaseClient() {
  const apiKeySetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "coinbase_api_key"))
    ;

  const apiSecretSetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "coinbase_api_secret"))
    ;

  const apiKey = apiKeySetting[0]?.value || process.env.COINBASE_API_KEY;
  const apiSecret = apiSecretSetting[0]?.value || process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Coinbase API key and secret not configured. Set COINBASE_API_KEY and COINBASE_API_SECRET in settings or environment.");
  }

  return new CoinbaseClient(apiKey, apiSecret);
}

export async function GET() {
  try {
    const client = await getCoinbaseClient();
    const summary = await client.getPortfolioSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
