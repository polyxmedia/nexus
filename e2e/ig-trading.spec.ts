import { test, expect, type BrowserContext } from "@playwright/test";

const TEST_USER = `e2e_test_ig_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";

let authedContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  authedContext = await browser.newContext();
  const page = await authedContext.newPage();

  await page.goto("/register");
  await page.locator('input[type="email"]').fill(`${TEST_USER}@e2etest.local`);
  await page.locator('input[type="text"]').fill(TEST_USER);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(TEST_PASS);
  await pwFields.nth(1).fill(TEST_PASS);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
  await page.close();
});

test.afterAll(async () => {
  await authedContext.close();
});

test.describe("IG Markets integration", () => {
  // ── Trading page UI ──

  test("trading page shows IG Markets tab", async () => {
    const page = await authedContext.newPage();
    await page.goto("/trading");
    const igTab = page.locator("button:has-text('IG Markets')");
    await expect(igTab).toBeVisible({ timeout: 8000 });
    await page.close();
  });

  test("IG tab shows not-connected state when no credentials", async () => {
    const page = await authedContext.newPage();
    await page.goto("/trading");
    await page.locator("button:has-text('IG Markets')").click();
    // Should show connection error since no IG keys are configured
    await expect(page.locator("text=Not connected")).toBeVisible({ timeout: 8000 });
    await page.close();
  });

  // ── Settings page ──

  test("settings page shows IG Markets credential fields", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings");
    await page.getByRole("tab", { name: /api keys/i }).click();

    // IG Markets section should exist
    await expect(page.locator("text=IG Markets")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[placeholder*="IG API key"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="IG username"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="IG password"]')).toBeVisible();
    await page.close();
  });

  // ── API routes (without credentials, expect graceful errors) ──

  test("IG account API returns 400 when not configured", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/ig/account");
    // Either 400 (not configured) or 403 (tier check) — both are acceptable
    expect([400, 403]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toContain("not configured");
    }
    await page.close();
  });

  test("IG portfolio API returns 400 when not configured", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/ig/portfolio");
    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  test("IG orders API returns 400 when not configured", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/ig/orders");
    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  test("IG search API requires query parameter", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/ig/search");
    // 400 (missing q) or 403 (tier) — both acceptable
    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  test("IG orders POST requires epic and size", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.post("/api/ig/orders", {
      data: { direction: "BUY" },
    });
    // 400 (validation) or 403 (tier)
    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  test("IG orders DELETE requires dealId", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.delete("/api/ig/orders");
    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  // ── Middleware protection ──

  test("IG API routes are protected by auth", async ({ page }) => {
    // Fresh page, no auth cookies
    await page.context().clearCookies();
    const response = await page.request.get("/api/ig/account");
    // Should redirect to login or return 401
    expect([301, 302, 401]).toContain(response.status());
  });
});
