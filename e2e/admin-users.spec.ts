import { test, expect, type BrowserContext } from "@playwright/test";

// Admin tests require first user (auto-admin). We register a fresh admin user
// and a target user to manage.
const ADMIN_USER = `e2e_test_admin_${Date.now()}`;
const TARGET_USER = `e2e_test_target_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";

let adminContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext();
  const page = await adminContext.newPage();

  // Register admin user (first user gets admin role)
  await page.goto("/register");
  await page.locator('input[type="email"]').fill(`${ADMIN_USER}@e2etest.local`);
  await page.locator('input[type="text"]').fill(ADMIN_USER);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(0).fill(TEST_PASS);
  await pwFields.nth(1).fill(TEST_PASS);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
  await page.close();
});

test.afterAll(async () => {
  await adminContext.close();
});

test.describe("Admin user management", () => {
  test("admin page loads and shows users tab", async () => {
    const page = await adminContext.newPage();
    await page.goto("/admin");
    // Should not redirect away (user is admin)
    await expect(page).toHaveURL(/\/admin/, { timeout: 8000 });
    // Click Users tab
    const usersTab = page.getByRole("tab", { name: /users/i });
    await expect(usersTab).toBeVisible({ timeout: 8000 });
    await usersTab.click();
    // Should see Add User button
    await expect(page.getByRole("button", { name: /add user/i })).toBeVisible({ timeout: 8000 });
    await page.close();
  });

  test("create user via admin API", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "create_user",
        password: TEST_PASS,
        email: `${TARGET_USER}@e2etest.local`,
        newRole: "user",
        newTier: "free",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.created).toBe(true);
    await page.close();
  });

  test("created user appears in users list", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.get("/api/admin/users");
    expect(response.status()).toBe(200);
    const users = await response.json();
    expect(Array.isArray(users)).toBe(true);
    const target = users.find((u: { username: string }) => u.username === TARGET_USER);
    expect(target).toBeTruthy();
    expect(target.role).toBe("user");
    expect(target.email).toBe(`${TARGET_USER}@e2etest.local`);
    await page.close();
  });

  test("duplicate username returns 409", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "create_user",
        password: TEST_PASS,
        email: "dup@e2etest.local",
      },
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("already taken");
    await page.close();
  });

  test("create user rejects short password", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: `e2e_test_short_${Date.now()}`,
        action: "create_user",
        password: "short",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("10 characters");
    await page.close();
  });

  test("create user rejects invalid username", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: "no spaces!",
        action: "create_user",
        password: TEST_PASS,
      },
    });
    expect(response.status()).toBe(400);
    await page.close();
  });

  test("edit user updates email and role", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "edit_user",
        email: "updated@e2etest.local",
        newRole: "admin",
        newTier: "analyst",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify changes
    const listRes = await page.request.get("/api/admin/users");
    const users = await listRes.json();
    const target = users.find((u: { username: string }) => u.username === TARGET_USER);
    expect(target.email).toBe("updated@e2etest.local");
    expect(target.role).toBe("admin");
    await page.close();
  });

  test("block user sets blocked flag", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "block_user",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.blocked).toBe(true);

    // Verify user is blocked in list
    const listRes = await page.request.get("/api/admin/users");
    const users = await listRes.json();
    const target = users.find((u: { username: string }) => u.username === TARGET_USER);
    expect(target.blocked).toBe(true);
    await page.close();
  });

  test("unblock user removes blocked flag", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "unblock_user",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.unblocked).toBe(true);

    // Verify user is unblocked
    const listRes = await page.request.get("/api/admin/users");
    const users = await listRes.json();
    const target = users.find((u: { username: string }) => u.username === TARGET_USER);
    expect(target.blocked).toBe(false);
    await page.close();
  });

  test("grant access creates comped subscription", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "grant_access",
        tier: "operator",
        note: "E2E test grant",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.granted).toBe("operator");
    await page.close();
  });

  test("revoke access cancels comped subscription", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "revoke_access",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.revoked).toBe(true);
    await page.close();
  });

  test("delete user removes user completely", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: TARGET_USER,
        action: "delete_user",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);

    // Verify user is gone
    const listRes = await page.request.get("/api/admin/users");
    const users = await listRes.json();
    const target = users.find((u: { username: string }) => u.username === TARGET_USER);
    expect(target).toBeUndefined();
    await page.close();
  });

  test("cannot delete yourself", async () => {
    const page = await adminContext.newPage();
    const response = await page.request.post("/api/admin/users", {
      data: {
        username: ADMIN_USER,
        action: "delete_user",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Cannot delete yourself");
    await page.close();
  });

  test("add user modal opens and has required fields", async () => {
    const page = await adminContext.newPage();
    await page.goto("/admin");
    await page.getByRole("tab", { name: /users/i }).click();
    await page.getByRole("button", { name: /add user/i }).click();

    // Modal should be visible with form fields
    await expect(page.locator("text=Create User")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="letters/numbers"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="user@example"]')).toBeVisible();

    // Role buttons
    await expect(page.locator("button:has-text('user')")).toBeVisible();
    await expect(page.locator("button:has-text('admin')")).toBeVisible();

    // Tier buttons
    await expect(page.locator("button:has-text('free')")).toBeVisible();
    await expect(page.locator("button:has-text('analyst')")).toBeVisible();
    await expect(page.locator("button:has-text('operator')")).toBeVisible();

    await page.close();
  });
});
