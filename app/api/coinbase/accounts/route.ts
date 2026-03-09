import { NextResponse } from "next/server";
import { CoinbaseClient } from "@/lib/coinbase/client";
import { requireTier } from "@/lib/auth/require-tier";
import { getSettingValue } from "@/lib/settings/get-setting";

async function getCoinbaseClient() {
  const apiKey = await getSettingValue("coinbase_api_key", process.env.COINBASE_API_KEY);
  const apiSecret = await getSettingValue("coinbase_api_secret", process.env.COINBASE_API_SECRET);

  if (!apiKey || !apiSecret) {
    throw new Error("Coinbase API key and secret not configured. Set COINBASE_API_KEY and COINBASE_API_SECRET in settings or environment.");
  }

  return new CoinbaseClient(apiKey, apiSecret);
}

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const client = await getCoinbaseClient();
    const summary = await client.getPortfolioSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
