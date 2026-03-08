import { test, expect } from "@playwright/test";

// Unique username per run — avoids clashes between runs
const TEST_USER = `e2e_test_auth_${Date.now()}`;
const TEST_EMAIL = `${TEST_USER}@e2etest.local`;
const TEST_PASS = "E2eTestPass!99";

// ── Helpers ────────────────────────────────────────────────────────────────

async function fillRegisterForm(
  page: import("@playwright/test").Page,
  opts: { email?: string; username: string; pass: string; confirm?: string }
) {
  await page.goto("/register");
  if (opts.email !== undefined) {
    await page.locator('input[type="email"]').fill(opts.email);
  }
  await page.locator('input[type="text"]').fill(opts.username);
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).fill(opts.pass);
  await pwInputs.nth(1).fill(opts.confirm ?? opts.pass);
  await page.getByRole("button", { name: /create account/i }).click();
}

async function fillLoginForm(
  page: import("@playwright/test").Page,
  username: string,
  password: string
) {
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
}

// ── Registration tests ────────────────────────────────────────────────────

test.describe("Registration", () => {
  test("registers a new account and lands on dashboard", async ({ page }) => {
    await fillRegisterForm(page, { email: TEST_EMAIL, username: TEST_USER, pass: TEST_PASS });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
  });

  test("shows error for duplicate username", async ({ page }) => {
    await fillRegisterForm(page, { email: "dup@e2etest.local", username: TEST_USER, pass: TEST_PASS });
    await expect(page.locator("text=already taken")).toBeVisible({ timeout: 6000 });
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await fillRegisterForm(page, {
      email: "mm@e2etest.local",
      username: `e2e_test_mm_${Date.now()}`,
      pass: TEST_PASS,
      confirm: "TotallyDifferent!00",
    });
    await expect(page.locator("text=Passwords do not match")).toBeVisible({ timeout: 5000 });
  });

  test("rejects username that is too short", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[type="text"]').fill("ab"); // 2 chars — below 3-char minimum
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill(TEST_PASS);
    await pwInputs.nth(1).fill(TEST_PASS);
    await page.getByRole("button", { name: /create account/i }).click();
    // HTML5 minLength blocks submission — should stay on /register
    await expect(page).toHaveURL(/\/register/);
  });
});

// ── Login tests ───────────────────────────────────────────────────────────

test.describe("Login", () => {
  test("logs in with valid credentials", async ({ page }) => {
    await fillLoginForm(page, TEST_USER, TEST_PASS);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
  });

  test("shows error for wrong password", async ({ page }) => {
    await fillLoginForm(page, TEST_USER, "WrongPassword!00");
    await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 6000 });
  });

  test("shows error for non-existent user", async ({ page }) => {
    await fillLoginForm(page, "e2e_ghost_user_nobody", TEST_PASS);
    await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 6000 });
  });

  test("redirect to login from protected route when unauthenticated", async ({ page }) => {
    // Clear any session cookies first
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login|\/register/, { timeout: 8000 });
  });
});
