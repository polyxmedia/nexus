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
      return NextResponse.json({
        configured: false,
        error: "IBKR gateway URL not configured. Add it in Settings or set IBKR_GATEWAY_URL in .env.local.",
      });
    }

    const { client, environment } = ibkr;

    try {
      const authStatus = await client.getAuthStatus();
      return NextResponse.json({
        configured: true,
        authenticated: authStatus.authenticated,
        connected: authStatus.connected,
        competing: authStatus.competing,
        environment,
        gatewayUrl: client.getGatewayUrl(),
      });
    } catch {
      return NextResponse.json({
        configured: true,
        authenticated: false,
        connected: false,
        environment,
        error: "Cannot reach IBKR gateway. Make sure the Client Portal Gateway is running.",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
