import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCoinbaseOAuthConfig } from "@/lib/coinbase/oauth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauthAvailable = !!getCoinbaseOAuthConfig();
  const username = session.user.name;

  // Check if user has OAuth tokens stored
  const tokenRows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `coinbase_oauth_access_token:${username}`));

  const connected = tokenRows.length > 0;

  return NextResponse.json({ oauthAvailable, connected });
}
