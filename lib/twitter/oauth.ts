// Twitter/X OAuth 2.0 with PKCE for posting tweets
// Docs: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code

import crypto from "crypto";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

// Scopes for posting tweets
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"].join(" ");

export function getTwitterOAuthConfig() {
  const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
  const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * Generate PKCE code verifier and challenge.
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function getAuthorizationUrl(state: string, codeChallenge: string, baseUrl?: string): string {
  const config = getTwitterOAuthConfig();
  if (!config) throw new Error("Twitter OAuth not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: getRedirectUri(baseUrl),
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string, baseUrl?: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}> {
  const config = getTwitterOAuthConfig();
  if (!config) throw new Error("Twitter OAuth not configured");

  // X API requires Basic auth header with client_id:client_secret
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(baseUrl),
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const config = getTwitterOAuthConfig();
  if (!config) throw new Error("Twitter OAuth not configured");

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

function getRedirectUri(baseUrl?: string): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/api/twitter/oauth/callback`;
}
