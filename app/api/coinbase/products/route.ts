import { NextRequest, NextResponse } from "next/server";
import { CoinbaseClient } from "@/lib/coinbase/client";
import { requireTier } from "@/lib/auth/require-tier";
import { getSettingValue } from "@/lib/settings/get-setting";

async function getCoinbaseClient() {
  const apiKey = await getSettingValue("coinbase_api_key", process.env.COINBASE_API_KEY);
  const apiSecret = await getSettingValue("coinbase_api_secret", process.env.COINBASE_API_SECRET);

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
