import { NextResponse } from "next/server";
import { getT212Client } from "@/lib/trading212/client";

export async function GET() {
  try {
    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured. Add TRADING212_API_KEY to .env.local or Settings." },
        { status: 400 }
      );
    }

    const { client, environment } = t212;
    const [accountInfo, accountCash] = await Promise.all([
      client.getAccountInfo(),
      client.getAccountCash(),
    ]);

    return NextResponse.json({ info: accountInfo, cash: accountCash, environment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
