import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getIGClient } from "@/lib/ig/client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json(
        { error: "IG Markets not configured. Add API key, username, and password in Settings." },
        { status: 400 }
      );
    }

    const [accountsData, sessionData] = await Promise.all([
      ig.client.getAccounts(),
      ig.client.getSession(),
    ]);

    // Use accountId from settings, or find preferred, or first
    const targetId = ig.accountId || sessionData.accountId;
    const account = accountsData.accounts.find(a => a.accountId === targetId) || accountsData.accounts[0];

    return NextResponse.json({
      connected: true,
      environment: ig.environment,
      account: account
        ? {
            accountId: account.accountId,
            accountName: account.accountName,
            accountType: account.accountType,
            status: account.status,
            currency: account.currency,
            balance: account.balance.balance,
            available: account.balance.available,
            deposit: account.balance.deposit,
            profitLoss: account.balance.profitLoss,
          }
        : null,
      accounts: accountsData.accounts.map(a => ({
        accountId: a.accountId,
        accountName: a.accountName,
        preferred: a.preferred,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
