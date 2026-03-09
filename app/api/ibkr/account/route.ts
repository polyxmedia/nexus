import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getIBKRClient } from "@/lib/ibkr/client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ibkr = await getIBKRClient();
    if (!ibkr) {
      return NextResponse.json(
        { error: "IBKR gateway URL not configured. Add it in Settings or set IBKR_GATEWAY_URL in .env.local." },
        { status: 400 }
      );
    }

    const { client, environment, accountId } = ibkr;

    // Get account list if no account ID configured
    let activeAccountId = accountId;
    if (!activeAccountId) {
      const accounts = await client.getAccounts();
      activeAccountId = accounts.selectedAccount || accounts.accounts?.[0] || null;
    }

    if (!activeAccountId) {
      return NextResponse.json({ error: "No IBKR account found. Configure account ID in Settings." }, { status: 400 });
    }

    const summary = await client.getAccountSummary(activeAccountId);

    return NextResponse.json({
      accountId: activeAccountId,
      summary,
      environment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
