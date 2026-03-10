import { NextResponse } from "next/server";
import { getCoinbaseClient } from "@/lib/coinbase/get-client";
import { requireTier } from "@/lib/auth/require-tier";
import { safeError } from "@/lib/security/csrf";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const client = await getCoinbaseClient(tierCheck.result.username);
    const summary = await client.getPortfolioSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return safeError("Coinbase", error);
  }
}
