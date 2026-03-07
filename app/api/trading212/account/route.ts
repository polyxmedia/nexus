import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Trading212Client, type Environment } from "@/lib/trading212/client";

export async function GET(request: NextRequest) {
  try {
    const apiKeySetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "t212_api_key"))
      ;

    const apiSecretSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "t212_api_secret"))
      ;

    const apiKey = apiKeySetting?.value || process.env.TRADING212_API_KEY;
    const apiSecret = apiSecretSetting?.value || process.env.TRADING212_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Trading212 API key and secret not configured" },
        { status: 400 }
      );
    }

    const envSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "trading_environment"))
      ;

    const environment = (envSetting?.value || "live") as Environment;
    const client = new Trading212Client(apiKey, apiSecret, environment);

    const [accountInfo, accountCash] = await Promise.all([
      client.getAccountInfo(),
      client.getAccountCash(),
    ]);

    return NextResponse.json({
      info: accountInfo,
      cash: accountCash,
      environment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
