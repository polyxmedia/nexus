// Coinbase OAuth 2.0 helpers for Advanced Trade API
// Docs: https://docs.cdp.coinbase.com/coinbase-app/docs/api-key-authentication

const COINBASE_AUTH_URL = "https://www.coinbase.com/oauth/authorize";
const COINBASE_TOKEN_URL = "https://api.coinbase.com/oauth/token";

// Scopes needed for portfolio viewing + trading
const SCOPES = [
  "wallet:accounts:read",
  "wallet:transactions:read",
  "wallet:buys:create",
  "wallet:buys:read",
  "wallet:sells:create",
  "wallet:sells:read",
  "wallet:orders:create",
  "wallet:orders:read",
].join(" ");

export function getCoinbaseOAuthConfig() {
  const clientId = process.env.COINBASE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.COINBASE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getAuthorizationUrl(state: string): string {
  const config = getCoinbaseOAuthConfig();
  if (!config) throw new Error("Coinbase OAuth not configured");

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    account: "all",
  });

  return `${COINBASE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const config = getCoinbaseOAuthConfig();
  if (!config) throw new Error("Coinbase OAuth not configured");

  const res = await fetch(COINBASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const config = getCoinbaseOAuthConfig();
  if (!config) throw new Error("Coinbase OAuth not configured");

  const res = await fetch(COINBASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/api/coinbase/oauth/callback`;
}
