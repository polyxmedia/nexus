import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getT212Client } from "@/lib/trading212/client";
import { requireTier } from "@/lib/auth/require-tier";
import { safeError } from "@/lib/security/csrf";

let cachedInstruments: unknown[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured. Add TRADING212_API_KEY to .env.local or Settings." },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (!cachedInstruments || now - cacheTimestamp > CACHE_TTL_MS) {
      cachedInstruments = await t212.client.getInstruments() as unknown[];
      cacheTimestamp = now;
    }

    return NextResponse.json(cachedInstruments);
  } catch (error) {
    return safeError("Trading212", error);
  }
}
