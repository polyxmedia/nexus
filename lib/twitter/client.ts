/**
 * Twitter/X API v2 client for posting tweets.
 *
 * Uses OAuth 1.0a User Context (required for posting).
 * Env vars: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 */

import crypto from "crypto";

interface TweetResult {
  id: string;
  text: string;
}

function getCredentials() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return null;
  }

  return { apiKey, apiSecret, accessToken, accessSecret };
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join("&");
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function buildAuthHeader(method: string, url: string, creds: NonNullable<ReturnType<typeof getCredentials>>): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, creds.apiSecret, creds.accessSecret);
  oauthParams.oauth_signature = signature;

  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

/**
 * Post a tweet. Returns the tweet ID and text, or null if Twitter is not configured.
 */
export async function postTweet(text: string): Promise<TweetResult | null> {
  const creds = getCredentials();
  if (!creds) return null;

  // X API enforces 280 character limit
  const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;

  const url = "https://api.x.com/2/tweets";
  const auth = buildAuthHeader("POST", url, creds);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: truncated }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[twitter] Failed to post tweet (${res.status}): ${body}`);
    return null;
  }

  const data = await res.json();
  return { id: data.data.id, text: data.data.text };
}

/**
 * Post a thread (multiple tweets in reply chain).
 */
export async function postThread(tweets: string[]): Promise<TweetResult[]> {
  const creds = getCredentials();
  if (!creds) return [];

  const results: TweetResult[] = [];
  let replyToId: string | undefined;

  for (const text of tweets) {
    const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;
    const url = "https://api.x.com/2/tweets";
    const auth = buildAuthHeader("POST", url, creds);

    const body: Record<string, unknown> = { text: truncated };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[twitter] Thread tweet failed (${res.status}): ${errBody}`);
      break;
    }

    const data = await res.json();
    const result = { id: data.data.id, text: data.data.text };
    results.push(result);
    replyToId = result.id;
  }

  return results;
}

export function isTwitterConfigured(): boolean {
  return getCredentials() !== null;
}
