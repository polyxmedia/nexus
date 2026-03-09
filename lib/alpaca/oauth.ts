// Alpaca OAuth 2.0 Authorization Code Flow
// Docs: https://docs.alpaca.markets/docs/using-oauth2-and-trading-api

const ALPACA_AUTH_URL = "https://app.alpaca.markets/oauth/authorize";
const ALPACA_TOKEN_URL = "https://api.alpaca.markets/oauth/token";

export function getAlpacaOAuthConfig() {
  const clientId = process.env.ALPACA_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ALPACA_OAUTH_CLIENT_SECRET;
  return { clientId, clientSecret, configured: !!clientId && !!clientSecret };
}

export function getAuthorizationUrl(state: string): string {
  const { clientId } = getAlpacaOAuthConfig();
  if (!clientId) throw new Error("ALPACA_OAUTH_CLIENT_ID not configured");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/alpaca/oauth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "account:write trading",
    env: "paper",
  });

  return `${ALPACA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> {
  const { clientId, clientSecret } = getAlpacaOAuthConfig();
  if (!clientId || !clientSecret) throw new Error("Alpaca OAuth not configured");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/alpaca/oauth/callback`;

  const res = await fetch(ALPACA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alpaca token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}
