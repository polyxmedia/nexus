import { test, expect, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";

const USER_FREE = `e2e_tier_free_${Date.now()}`;
const USER_ANALYST = `e2e_tier_anl_${Date.now()}`;
const USER_OPERATOR = `e2e_tier_opr_${Date.now()}`;
const TEST_PASS = "E2eTierPass!99";

let freeContext: BrowserContext;
let analystContext: BrowserContext;
let operatorContext: BrowserContext;

async function dbQuery(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}

async function createUserInDb(username: string, tier: string) {
  const hashed = await hash(TEST_PASS, 12);
  const value = JSON.stringify({
    password: hashed,
    role: "user",
    email: `${username}@e2etest.local`,
    tier,
  });
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`user:${username}`, value]
  );
}

async function login(ctx: BrowserContext, username: string) {
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(TEST_PASS);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
  await page.close();
}

async function apiGet(ctx: BrowserContext, url: string) {
  const page = await ctx.newPage();
  const res = await page.request.fetch(`http://localhost:3000${url}`);
  const status = res.status();
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  await page.close();
  return { status, body };
}

test.describe.serial("Tier access gating", () => {
  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);

    // Create users directly in DB (avoids registration rate limits)
    await createUserInDb(USER_FREE, "free");
    await createUserInDb(USER_ANALYST, "analyst");
    await createUserInDb(USER_OPERATOR, "operator");

    // Login each user to get session cookies
    freeContext = await browser.newContext();
    await login(freeContext, USER_FREE);

    analystContext = await browser.newContext();
    await login(analystContext, USER_ANALYST);

    operatorContext = await browser.newContext();
    await login(operatorContext, USER_OPERATOR);
  });

  test.afterAll(async () => {
    await freeContext?.close();
    await analystContext?.close();
    await operatorContext?.close();
  });

  // ═══════════════════════════════════════════
  // FREE TIER - can access free-gated routes
  // ═══════════════════════════════════════════

  test("free: can access dashboard (free gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/dashboard/widgets");
    expect([200, 304]).toContain(status);
  });

  test("free: can access warroom (free gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/warroom");
    expect([200, 304]).toContain(status);
  });

  test("free: can access predictions (free gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/predictions");
    expect(status).toBe(200);
  });

  // ═══════════════════════════════════════════
  // FREE TIER - blocked from analyst routes
  // ═══════════════════════════════════════════

  test("free: blocked from signals (analyst gate)", async () => {
    const { status, body } = await apiGet(freeContext, "/api/signals");
    expect(status).toBe(403);
    expect(body?.requiredTier).toBe("analyst");
    expect(body?.currentTier).toBe("free");
  });

  test("free: blocked from game theory (analyst gate)", async () => {
    const { status, body } = await apiGet(freeContext, "/api/game-theory");
    expect(status).toBe(403);
    expect(body?.requiredTier).toBe("analyst");
  });

  // ═══════════════════════════════════════════
  // FREE TIER - blocked from operator routes
  // ═══════════════════════════════════════════

  test("free: blocked from trading (operator gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/trading212/portfolio");
    expect(status).toBe(403);
  });

  test("free: blocked from gex (operator gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/gex");
    expect(status).toBe(403);
  });

  test("free: blocked from short interest (operator gate)", async () => {
    const { status } = await apiGet(freeContext, "/api/short-interest");
    expect(status).toBe(403);
  });

  // ═══════════════════════════════════════════
  // ANALYST TIER - can access analyst routes
  // ═══════════════════════════════════════════

  test("analyst: can access signals (analyst gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/signals");
    expect(status).toBe(200);
  });

  test("analyst: can access game theory (analyst gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/game-theory");
    expect(status).toBe(200);
  });

  test("analyst: can access dashboard (free gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/dashboard/widgets");
    expect([200, 304]).toContain(status);
  });

  test("analyst: can access warroom (free gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/warroom");
    expect([200, 304]).toContain(status);
  });

  test("analyst: can access predictions (free gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/predictions");
    expect(status).toBe(200);
  });

  // ═══════════════════════════════════════════
  // ANALYST TIER - blocked from operator routes
  // ═══════════════════════════════════════════

  test("analyst: blocked from trading (operator gate)", async () => {
    const { status, body } = await apiGet(analystContext, "/api/trading212/portfolio");
    expect(status).toBe(403);
    expect(body?.requiredTier).toBe("operator");
  });

  test("analyst: blocked from gex (operator gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/gex");
    expect(status).toBe(403);
  });

  test("analyst: blocked from short interest (operator gate)", async () => {
    const { status } = await apiGet(analystContext, "/api/short-interest");
    expect(status).toBe(403);
  });

  // ═══════════════════════════════════════════
  // OPERATOR TIER - can access everything
  // ═══════════════════════════════════════════

  test("operator: can access analyst-gated routes", async () => {
    const endpoints = ["/api/signals", "/api/game-theory"];
    for (const url of endpoints) {
      const { status } = await apiGet(operatorContext, url);
      expect(status, `${url} should be accessible to operator`).toBe(200);
    }
  });

  test("operator: can access free-gated routes", async () => {
    const endpoints = ["/api/dashboard/widgets", "/api/warroom", "/api/predictions"];
    for (const url of endpoints) {
      const { status } = await apiGet(operatorContext, url);
      expect([200, 304], `${url} should be accessible to operator`).toContain(status);
    }
  });

  test("operator: can access gex (operator gate)", async () => {
    const { status } = await apiGet(operatorContext, "/api/gex");
    expect(status !== 403, "operator should not be tier-blocked from gex").toBeTruthy();
  });

  test("operator: can access short interest (operator gate)", async () => {
    const { status } = await apiGet(operatorContext, "/api/short-interest");
    expect(status !== 403, "operator should not be tier-blocked from short interest").toBeTruthy();
  });

  test("operator: can access trading (operator gate)", async () => {
    const { status } = await apiGet(operatorContext, "/api/trading212/portfolio");
    expect(status !== 403, "operator should not be tier-blocked from trading").toBeTruthy();
  });

  // ═══════════════════════════════════════════
  // CREDITS API - tier reflected correctly
  // ═══════════════════════════════════════════

  test("credits API reflects free tier", async () => {
    const { status, body } = await apiGet(freeContext, "/api/credits");
    expect(status).toBe(200);
    expect(body?.tier).toBe("free");
  });

  test("credits API reflects analyst tier", async () => {
    const { status, body } = await apiGet(analystContext, "/api/credits");
    expect(status).toBe(200);
    expect(body?.tier).toBe("analyst");
    expect(body?.creditsGranted).toBeGreaterThan(0);
  });

  test("credits API reflects operator tier", async () => {
    const { status, body } = await apiGet(operatorContext, "/api/credits");
    expect(status).toBe(200);
    expect(body?.tier).toBe("operator");
    expect(body?.creditsGranted).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════
  // 403 RESPONSE SHAPE
  // ═══════════════════════════════════════════

  test("403 response includes upgrade info with correct shape", async () => {
    const { status, body } = await apiGet(freeContext, "/api/signals");
    expect(status).toBe(403);
    expect(body).toMatchObject({
      error: expect.stringContaining("requires"),
      requiredTier: "analyst",
      currentTier: "free",
      upgrade: true,
    });
  });

  test("analyst 403 on operator route shows correct tiers", async () => {
    const { status, body } = await apiGet(analystContext, "/api/gex");
    expect(status).toBe(403);
    expect(body).toMatchObject({
      requiredTier: "operator",
      currentTier: "analyst",
      upgrade: true,
    });
  });
});
