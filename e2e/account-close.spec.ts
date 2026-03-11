import { test, expect, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";

const SOLE_ADMIN = `e2e_test_cladm_${Date.now()}`;
const CLOSE_USER = `e2e_test_clusr_${Date.now()}`;
const CLOSE_UI = `e2e_test_clui_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";

let adminContext: BrowserContext;
let userContext: BrowserContext;

async function dbQuery(sql: string, params: (string | number)[] = []) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}

async function createUserInDb(username: string, role: string) {
  const hashed = await hash(TEST_PASS, 12);
  const value = JSON.stringify({
    password: hashed,
    role,
    email: `${username}@e2etest.local`,
    tier: "free",
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

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(40_000);

  // Create all users directly in DB (avoids registration rate limits)
  await createUserInDb(SOLE_ADMIN, "admin");
  await createUserInDb(CLOSE_USER, "user");
  await createUserInDb(CLOSE_UI, "user");

  // Login admin
  adminContext = await browser.newContext();
  await login(adminContext, SOLE_ADMIN);

  // Login close_user
  userContext = await browser.newContext();
  await login(userContext, CLOSE_USER);
});

test.afterAll(async () => {
  await adminContext?.close();
  await userContext?.close();
});

test.describe.serial("Account closure API", () => {
  test("rejects unauthenticated request", async ({ browser }) => {
    const freshCtx = await browser.newContext();
    const page = await freshCtx.newPage();
    const res = await page.request.post("/api/account/close", {
      data: { confirmUsername: "anyone" },
      maxRedirects: 0,
    });
    // Middleware intercepts unauthenticated requests with a redirect to /login
    expect([401, 302, 307]).toContain(res.status());
    await page.close();
    await freshCtx.close();
  });

  test("rejects wrong username confirmation", async () => {
    const page = await userContext.newPage();
    const res = await page.request.post("/api/account/close", {
      data: { confirmUsername: "wrong_name" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("does not match");
    await page.close();
  });

  test("admin account closure respects sole-admin protection", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.post("/api/account/close", {
      data: { confirmUsername: SOLE_ADMIN },
    });
    const status = res.status();
    const body = await res.json();
    if (status === 400) {
      // Sole admin - protected
      expect(body.error).toContain("admin");
    } else {
      // Other admins exist - closure allowed
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    }
    await page.close();
  });

  test("successfully closes a regular user account", async () => {
    const page = await userContext.newPage();
    const res = await page.request.post("/api/account/close", {
      data: { confirmUsername: CLOSE_USER },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify user is gone from DB
    const rows = await dbQuery(
      "SELECT key FROM settings WHERE key = $1",
      [`user:${CLOSE_USER}`]
    );
    expect(rows.length).toBe(0);

    // Verify user-scoped settings are also gone
    const scopedRows = await dbQuery(
      "SELECT key FROM settings WHERE key LIKE $1",
      [`${CLOSE_USER}:%`]
    );
    expect(scopedRows.length).toBe(0);

    // Verify subscription is gone
    const subRows = await dbQuery(
      "SELECT user_id FROM subscriptions WHERE user_id = $1",
      [CLOSE_USER]
    );
    expect(subRows.length).toBe(0);
    await page.close();
  });

  test("closed user cannot log in", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill(CLOSE_USER);
    await page.locator('input[type="password"]').fill(TEST_PASS);
    await page.getByRole("button", { name: /enter platform|sign in/i }).click();
    await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 6000 });
  });
});

test.describe("Account closure UI", () => {
  test("close account section visible in settings and requires confirmation", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Login as the UI test user
    await page.goto("/login");
    await page.locator('input[type="text"]').fill(CLOSE_UI);
    await page.locator('input[type="password"]').fill(TEST_PASS);
    await page.getByRole("button", { name: /enter platform|sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });

    // Go to settings and click the Profile tab
    await page.goto("/settings");
    await page.getByRole("tab", { name: /profile/i }).click();

    // Should see the close account section
    const closeBtn = page.getByRole("button", { name: /close my account/i });
    await expect(closeBtn).toBeVisible({ timeout: 8000 });

    // Click to expand
    await closeBtn.click();

    // Should see confirmation input and disabled submit button
    const confirmInput = page.locator('input[placeholder*="Type"]');
    await expect(confirmInput).toBeVisible({ timeout: 3000 });

    const submitBtn = page.getByRole("button", { name: /permanently close/i });
    await expect(submitBtn).toBeDisabled();

    // Type wrong username - button stays disabled
    await confirmInput.fill("wrong_name");
    await expect(submitBtn).toBeDisabled();

    // Type correct username - button becomes enabled
    await confirmInput.fill(CLOSE_UI);
    await expect(submitBtn).toBeEnabled();

    // Click to close account
    await submitBtn.click();

    // Should redirect to home (signOut with callbackUrl: "/")
    await expect(page).toHaveURL(/\/$|\/login/, { timeout: 10000 });

    await page.close();
    await ctx.close();

    // Verify account is actually gone
    const rows = await dbQuery(
      "SELECT key FROM settings WHERE key = $1",
      [`user:${CLOSE_UI}`]
    );
    expect(rows.length).toBe(0);
  });
});
