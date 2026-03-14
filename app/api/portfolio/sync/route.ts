import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { syncPortfolio } from "@/lib/portfolio/aggregator";

export async function POST() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const portfolio = await syncPortfolio(check.result.username);
    return NextResponse.json(portfolio);
  } catch (err) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
