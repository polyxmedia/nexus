// Twitter/X OAuth 2.0 with PKCE for posting tweets
// Docs: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code

import crypto from "crypto";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

// Scopes for posting tweets
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"].join(" ");

export function getTwitterOAuthConfig() {
  const clientId = process.env.TWITTER_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId) return null;
  // clientSecret is optional: public clients (PKCE-only) don't have one
  return { clientId, clientSecret: clientSecret || null };
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

  // Always include client_id in body (Twitter requires it for PKCE flows)
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(baseUrl),
    code_verifier: codeVerifier,
    client_id: config.clientId,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Confidential clients: also send Basic auth header
  if (config.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
  }

  let res = await fetch(TWITTER_TOKEN_URL, { method: "POST", headers, body: new URLSearchParams(body) });

  // Fallback: if Basic auth fails, retry with client_secret in body instead
  // (some Twitter app configurations prefer body credentials over header)
  if (!res.ok && config.clientSecret && res.status === 401) {
    const fallbackBody = { ...body, client_secret: config.clientSecret };
    const fallbackHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    res = await fetch(TWITTER_TOKEN_URL, { method: "POST", headers: fallbackHeaders, body: new URLSearchParams(fallbackBody) });
  }

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

  const body: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
  }

  let res = await fetch(TWITTER_TOKEN_URL, { method: "POST", headers, body: new URLSearchParams(body) });

  if (!res.ok && config.clientSecret && res.status === 401) {
    const fallbackBody = { ...body, client_secret: config.clientSecret };
    const fallbackHeaders: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    res = await fetch(TWITTER_TOKEN_URL, { method: "POST", headers: fallbackHeaders, body: new URLSearchParams(fallbackBody) });
  }

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
