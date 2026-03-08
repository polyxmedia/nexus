import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CoinbaseClient } from "@/lib/coinbase/client";
import { requireTier } from "@/lib/auth/require-tier";

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
    throw new Error("Coinbase API credentials not configured");
  }

  return new CoinbaseClient(apiKey, apiSecret);
}

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const client = await getCoinbaseClient();

    if (productId) {
      const product = await client.getProduct(productId);
      return NextResponse.json(product);
    }

    const products = await client.getProducts("SPOT");
    return NextResponse.json(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
