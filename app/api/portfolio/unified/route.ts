import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getUnifiedPortfolio } from "@/lib/portfolio/aggregator";

export async function GET() {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  try {
    const portfolio = await getUnifiedPortfolio(check.result.username);
    return NextResponse.json(portfolio || { positions: [], totalValue: 0 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
