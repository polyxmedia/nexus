import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getIBKRClient } from "@/lib/ibkr/client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "q query parameter is required" }, { status: 400 });
    }

    const ibkr = await getIBKRClient();
    if (!ibkr) {
      return NextResponse.json({ error: "IBKR gateway URL not configured." }, { status: 400 });
    }

    const results = await ibkr.client.searchContracts(query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
