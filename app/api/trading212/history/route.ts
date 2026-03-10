import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getT212Client } from "@/lib/trading212/client";
import { requireTier } from "@/lib/auth/require-tier";
import { safeError } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured. Add TRADING212_API_KEY to .env.local or Settings." },
        { status: 400 }
      );
    }

    const history = await t212.client.getOrderHistory(cursor, limit);
    return NextResponse.json(history);
  } catch (error) {
    return safeError("Trading212", error);
  }
}
