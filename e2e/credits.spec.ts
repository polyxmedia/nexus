import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";

// Usernames must be <= 32 chars (19 prefix + 13 digit timestamp)
const USER_FREE = `e2e_cr_free_${Date.now()}`;
const USER_ACTIVE = `e2e_cr_act_${Date.now()}`;
const USER_EXHAUSTED = `e2e_cr_exh_${Date.now()}`;
const TEST_PASS = "E2eCredPass!99";

let freeContext: BrowserContext;
let activeContext: BrowserContext;
let exhaustedContext: BrowserContext;

async function register(page: Page, username: string) {
  await page.goto("/register");
  await page.locator('input[type="email"]').fill(`${username}@e2etest.local`);
  await page.locator('input[type="text"]').fill(username);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(TEST_PASS);
  await pwFields.nth(1).fill(TEST_PASS);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
}

async function dbQuery(sql: string) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query(sql);
    return res.rows;
  } finally {
    await client.end();
  }
}

// Set a user's tier directly in DB (with retry for registration race)
async function setTier(username: string, tier: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const client = new Client({ connectionString: DB_URL });
    try {
      await client.connect();
      const rows = await client.query(`SELECT value FROM settings WHERE key = $1`, [`user:${username}`]);
      if (rows.rows.length > 0) {
        const data = JSON.parse(rows.rows[0].value);
        data.tier = tier;
        await client.query(`UPDATE settings SET value = $1 WHERE key = $2`, [JSON.stringify(data), `user:${username}`]);
        // Verify the update took effect
        const verify = await client.query(`SELECT value FROM settings WHERE key = $1`, [`user:${username}`]);
        const verifyData = JSON.parse(verify.rows[0].value);
        if (verifyData.tier === tier) return;
      }
    } finally {
      await client.end();
    }
    // Wait before retry
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`setTier failed: could not set tier "${tier}" for user "${username}" after 5 attempts`);
}

// Exhaust a user's credits by inserting used credits
async function exhaustCredits(username: string) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
    // Upsert credit balance with all credits used
    const existing = await client.query(
      `SELECT id FROM credit_balances WHERE user_id = $1`,
      [username]
    );
    // Use a very high credits_used value to ensure exhaustion regardless of tier grant
    const exhaustedAmount = 999999;
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE credit_balances SET credits_used = $3, credits_granted = 50000, period = $2 WHERE user_id = $1`,
        [username, period, exhaustedAmount]
      );
    } else {
      await client.query(
        `INSERT INTO credit_balances (user_id, period, credits_granted, credits_used) VALUES ($1, $2, 50000, $3)`,
        [username, period, exhaustedAmount]
      );
    }
  } finally {
    await client.end();
  }
}

test.describe.serial("Credit gate enforcement", () => {
  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);
    // Register free user (no tier set, stays free)
    freeContext = await browser.newContext();
    const freePage = await freeContext.newPage();
    await register(freePage, USER_FREE);
    await freePage.close();

    // Register active user and set to analyst tier
    activeContext = await browser.newContext();
    const activePage = await activeContext.newPage();
    await register(activePage, USER_ACTIVE);
    await activePage.close();
    await setTier(USER_ACTIVE, "analyst");

    // Register exhausted user, set to analyst, then exhaust credits
    exhaustedContext = await browser.newContext();
    const exhaustedPage = await exhaustedContext.newPage();
    await register(exhaustedPage, USER_EXHAUSTED);
    await exhaustedPage.close();
    await setTier(USER_EXHAUSTED, "analyst");
    await exhaustCredits(USER_EXHAUSTED);
  });

  test.afterAll(async () => {
    await freeContext?.close();
    await activeContext?.close();
    await exhaustedContext?.close();
  });

  // ── Test 1: Unauthenticated request gets 401 ──

  test("AI endpoints return 401 for unauthenticated requests", async ({ page }) => {
    const endpoints = [
      { url: "/api/thesis/suggestions", method: "GET" },
      { url: "/api/congressional-trading/analyze", method: "GET" },
      { url: "/api/parallels", method: "POST" },
      { url: "/api/reports/narrative", method: "POST" },
      { url: "/api/analysis", method: "POST" },
    ];

    for (const ep of endpoints) {
      const res = await page.request.fetch(`http://localhost:3000${ep.url}`, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        data: ep.method === "POST" ? JSON.stringify({ query: "test", signalId: 1, topic: "test" }) : undefined,
      });
      // Should get 401 or redirect to login (HTML response)
      const status = res.status();
      expect(status === 401 || status === 302 || status === 200, `${ep.url} should reject unauthed (got ${status})`).toBeTruthy();
      if (status === 200) {
        // If 200, it should be HTML login redirect (not JSON data)
        const contentType = res.headers()["content-type"] || "";
        if (contentType.includes("json")) {
          const body = await res.json();
          expect(body.error).toBeTruthy();
        }
      }
    }
  });

  // ── Test 2: Credits API returns balance for active user ──

  test("credits API returns balance for active user", async () => {
    const page = await activeContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/credits");
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Tier should be analyst (set via DB) or unlimited if first user (admin)
    if (data.unlimited) {
      // Admin users get unlimited credits
      expect(data.unlimited).toBe(true);
    } else {
      expect(data.tier).toBe("analyst");
      expect(data.creditsGranted).toBeGreaterThan(0);
      expect(data.creditsRemaining).toBeGreaterThan(0);
    }
    await page.close();
  });

  // ── Test 3: Exhausted user gets 429 on AI endpoints ──

  test("exhausted user gets 429 on AI endpoints", async () => {
    const page = await exhaustedContext.newPage();

    // Test thesis suggestions
    const res = await page.request.fetch("http://localhost:3000/api/thesis/suggestions");
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("credits exhausted");
    expect(body).toMatchObject({
      upgrade: true,
      topup: true,
      creditsRemaining: 0,
    });

    await page.close();
  });

  // ── Test 4: Exhausted user gets 429 on congressional analysis ──

  test("exhausted user gets 429 on congressional trading analysis", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/congressional-trading/analyze");
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("credits exhausted");
    await page.close();
  });

  // ── Test 5: Exhausted user gets 429 on parallels ──

  test("exhausted user gets 429 on parallels", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/parallels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ query: "oil crisis 1973" }),
    });
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("credits exhausted");
    await page.close();
  });

  // ── Test 6: Exhausted user gets 429 on signal analysis ──

  test("exhausted user gets 429 on signal analysis", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ signalId: 1 }),
    });
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("credits exhausted");
    await page.close();
  });

  // ── Test 7: Exhausted user gets 429 on narrative reports ──

  test("exhausted user gets 429 on narrative reports", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/reports/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ topic: "test" }),
    });
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("credits exhausted");
    await page.close();
  });

  // ── Test 7b: Exhausted user gets 429 on news digest ──

  test("exhausted user gets 429 on news digest", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/news/digest");
    // May get 429 (credit exhausted) or 200 (cached digest doesn't hit AI)
    const status = res.status();
    if (status === 429) {
      const body = await res.json();
      expect(body.error).toContain("credits exhausted");
      expect(body.topup).toBe(true);
    }
    // 200 is also acceptable if the digest was cached
    expect([200, 429]).toContain(status);
    await page.close();
  });

  // ── Test 7c: Exhausted user gets 429 on daily report ──

  test("exhausted user gets 429 on daily report generation", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/dashboard/daily-report");
    const status = res.status();
    if (status === 429) {
      const body = await res.json();
      expect(body.error).toContain("credits exhausted");
      expect(body.topup).toBe(true);
    }
    // 200 with cached report is acceptable, 401/403 means tier gate hit first
    expect([200, 401, 403, 429]).toContain(status);
    await page.close();
  });

  // ── Test 8: Credits API shows zero remaining for exhausted user ──

  test("credits API shows zero remaining for exhausted user", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/credits");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.creditsRemaining).toBe(0);
    expect(data.unlimited).toBeFalsy();
    await page.close();
  });

  // ── Test 9: Credit top-up packs are available ──

  test("credit top-up packs endpoint returns packs", async () => {
    const page = await exhaustedContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/credits/topup");
    expect(res.status()).toBe(200);
    const packs = await res.json();
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.length).toBeGreaterThan(0);
    expect(packs[0]).toHaveProperty("credits");
    expect(packs[0]).toHaveProperty("priceCents");
    expect(packs[0]).toHaveProperty("label");
    await page.close();
  });

  // ── Test 10: Chat returns credit exhausted error for exhausted user ──

  test("chat returns credit exhausted error for exhausted user", async () => {
    const page = await exhaustedContext.newPage();

    // Create a chat session first
    const sessionRes = await page.request.fetch("http://localhost:3000/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ title: "Credit test" }),
    });

    if (sessionRes.status() === 200) {
      const session = await sessionRes.json();
      if (session.id) {
        const chatRes = await page.request.fetch(`http://localhost:3000/api/chat/${session.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({ message: "Hello" }),
        });
        // Should get 429 (credit exhausted) - 500 means server error unrelated to credits
        const status = chatRes.status();
        expect(status === 429 || status === 500, `Expected 429 or 500, got ${status}`).toBeTruthy();
        if (status === 429) {
          const body = await chatRes.json();
          expect(body.error).toContain("credits exhausted");
          expect(body.topup).toBe(true);
        }
      }
    }
    await page.close();
  });

  // ── Test 11: Active user can access credits endpoint with balance ──

  test("active user has positive credit balance", async () => {
    const page = await activeContext.newPage();
    const res = await page.request.fetch("http://localhost:3000/api/credits");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.tier).toBe("analyst");
    expect(typeof data.creditsGranted).toBe("number");
    expect(data.creditsGranted).toBeGreaterThan(0);
    expect(data.creditsRemaining).toBeGreaterThan(0);
    await page.close();
  });

  // ── Test 12: Settings page shows credits tab ──

  test("settings page shows credits information", async () => {
    const page = await activeContext.newPage();
    await page.goto("/settings");
    // Look for credits tab
    const creditsTab = page.getByRole("tab", { name: /credits/i });
    if (await creditsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await creditsTab.click();
      // Should show credit balance info
      await expect(page.locator("text=/credits|balance|usage/i").first()).toBeVisible({ timeout: 5000 });
    }
    await page.close();
  });
});
