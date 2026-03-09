import { NextResponse } from "next/server";
import { getCoinbaseClient } from "@/lib/coinbase/get-client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const client = await getCoinbaseClient(tierCheck.result.username);
    const summary = await client.getPortfolioSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
