import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAlpacaOAuthConfig } from "@/lib/alpaca/oauth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { configured } = getAlpacaOAuthConfig();

  try {
    const rows = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, `alpaca_oauth_access_token:${session.user.name}`));
    const connected = rows.length > 0 && !!rows[0].value;
    return NextResponse.json({ oauthAvailable: configured, connected });
  } catch {
    return NextResponse.json({ oauthAvailable: configured, connected: false });
  }
}
