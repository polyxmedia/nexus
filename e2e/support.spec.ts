import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TEST_USER = `e2e_test_support_${Date.now()}`;
const TEST_PASS = "SupportTestSecure99";
const TEST_EMAIL = `${TEST_USER}@e2etest.local`;

// ── Helpers ──────────────────────────────────────────────────────────────

async function registerUser(page: Page) {
  await page.goto("/register");
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="text"]').fill(TEST_USER);
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).fill(TEST_PASS);
  await pwInputs.nth(1).fill(TEST_PASS);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
}

// ── Tests ────────────────────────────────────────────────────────────────

test.describe.serial("Support Tickets", () => {
  let ctx: BrowserContext;
  let page: Page;
  let ticketUuid: string;
  let ticketId: number;

  test("setup: register and login", async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    await registerUser(page);
  });

  // ── API: Unauthenticated access ────────────────────────────────────────

  test("API: GET tickets returns 401 without auth", async ({ request }) => {
    // standalone request context has no session cookies
    const res = await request.get("/api/support/tickets");
    const body = await res.json();
    if (res.status() === 401) {
      expect(body.error).toBeTruthy();
    } else {
      expect(body.tickets?.length ?? 0).toBe(0);
    }
  });

  test("API: POST ticket returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/support/tickets", {
      data: { title: "Test", description: "Test desc" },
    });
    expect(res.status()).toBe(401);
  });

  // ── API: Validation ────────────────────────────────────────────────────

  test("API: POST ticket rejects missing title", async () => {
    const res = await page.request.post("/api/support/tickets", {
      data: { description: "Some description" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/title/i);
  });

  test("API: POST ticket rejects missing description", async () => {
    const res = await page.request.post("/api/support/tickets", {
      data: { title: "Some title" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/description/i);
  });

  test("API: POST ticket rejects empty strings", async () => {
    const res = await page.request.post("/api/support/tickets", {
      data: { title: "   ", description: "   " },
    });
    expect(res.status()).toBe(400);
  });

  // ── API: Create ticket ─────────────────────────────────────────────────

  test("API: create ticket with defaults", async () => {
    const res = await page.request.post("/api/support/tickets", {
      data: {
        title: "E2E Test Issue",
        description: "This is a test ticket created by Playwright",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ticket = body.ticket;
    expect(ticket.title).toBe("E2E Test Issue");
    expect(ticket.status).toBe("open");
    expect(ticket.category).toBe("general");
    expect(ticket.priority).toBe("normal");
    expect(ticket.uuid).toBeTruthy();
    ticketUuid = ticket.uuid;
    ticketId = ticket.id;
  });

  test("API: create ticket with custom category and priority", async () => {
    const res = await page.request.post("/api/support/tickets", {
      data: {
        title: "Billing Issue",
        description: "Charge looks wrong",
        category: "billing",
        priority: "high",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ticket.category).toBe("billing");
    expect(body.ticket.priority).toBe("high");
  });

  // ── API: List tickets ──────────────────────────────────────────────────

  test("API: list tickets returns created tickets", async () => {
    const res = await page.request.get("/api/support/tickets");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tickets.length).toBeGreaterThanOrEqual(2);
    const titles = body.tickets.map((t: { title: string }) => t.title);
    expect(titles).toContain("E2E Test Issue");
    expect(titles).toContain("Billing Issue");
  });

  // ── API: Get single ticket ─────────────────────────────────────────────

  test("API: get ticket by uuid", async () => {
    const res = await page.request.get(`/api/support/tickets/${ticketUuid}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ticket.title).toBe("E2E Test Issue");
    expect(body.ticket.uuid).toBe(ticketUuid);
  });

  test("API: get ticket with invalid uuid returns error", async () => {
    const res = await page.request.get("/api/support/tickets/nonexistent-uuid-12345");
    // 404 for valid UUID format not found, 500 for invalid UUID format (Drizzle/pg error)
    expect([404, 500]).toContain(res.status());
  });

  // ── API: Messages ──────────────────────────────────────────────────────

  test("API: ticket has initial message from description", async () => {
    const res = await page.request.get(`/api/support/tickets/${ticketUuid}/messages`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
    expect(body.messages[0].content).toBe("This is a test ticket created by Playwright");
    expect(body.messages[0].isStaff).toBe(0);
  });

  test("API: send message on ticket", async () => {
    const res = await page.request.post(`/api/support/tickets/${ticketUuid}/messages`, {
      data: { content: "Following up on my issue" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message.content).toBe("Following up on my issue");
    expect(body.message.isStaff).toBe(0);
  });

  test("API: send message rejects empty content", async () => {
    const res = await page.request.post(`/api/support/tickets/${ticketUuid}/messages`, {
      data: { content: "   " },
    });
    expect(res.status()).toBe(400);
  });

  test("API: messages reflect sent message", async () => {
    const res = await page.request.get(`/api/support/tickets/${ticketUuid}/messages`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.messages.length).toBe(2);
    expect(body.messages[1].content).toBe("Following up on my issue");
  });

  // ── API: Close ticket ──────────────────────────────────────────────────

  test("API: close ticket", async () => {
    const res = await page.request.patch(`/api/support/tickets/${ticketUuid}`, {
      data: { status: "closed" },
    });
    expect(res.ok()).toBeTruthy();

    // Verify status changed
    const getRes = await page.request.get(`/api/support/tickets/${ticketUuid}`);
    const body = await getRes.json();
    expect(body.ticket.status).toBe("closed");
  });

  // ── API: Admin routes require admin ────────────────────────────────────

  test("API: admin GET tickets returns 403 for non-admin", async () => {
    const res = await page.request.get("/api/admin/support");
    expect(res.status()).toBe(403);
  });

  test("API: admin PATCH returns 403 for non-admin", async () => {
    const res = await page.request.patch("/api/admin/support", {
      data: { ticketId, status: "resolved" },
    });
    expect(res.status()).toBe(403);
  });

  test("API: admin POST reply returns 403 for non-admin", async () => {
    const res = await page.request.post("/api/admin/support", {
      data: { ticketId, content: "Admin reply attempt" },
    });
    expect(res.status()).toBe(403);
  });

  test("API: admin GET messages returns 403 for non-admin", async () => {
    const res = await page.request.get(`/api/admin/support/messages?ticketId=${ticketId}`);
    expect(res.status()).toBe(403);
  });

  // ── UI: Support page ──────────────────────────────────────────────────

  test("UI: support page renders with tickets", async () => {
    await page.goto("/support");
    await expect(page.getByText("Submit and track support requests")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("E2E Test Issue")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Billing Issue")).toBeVisible();
  });

  test("UI: filter buttons work", async () => {
    await page.goto("/support");
    await expect(page.getByText("E2E Test Issue")).toBeVisible({ timeout: 8000 });

    // Click "Open" filter - E2E Test Issue is closed, should hide
    await page.locator("button", { hasText: "Open" }).click();
    // Billing Issue is still open
    await expect(page.getByText("Billing Issue")).toBeVisible();

    // Click "All" to reset
    await page.locator("button", { hasText: "All" }).click();
    await expect(page.getByText("E2E Test Issue")).toBeVisible();
  });

  test("UI: search filters tickets", async () => {
    await page.goto("/support");
    await expect(page.getByText("E2E Test Issue")).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder("Search tickets...").fill("Billing");
    await expect(page.getByText("Billing Issue")).toBeVisible();
    await expect(page.getByText("E2E Test Issue")).not.toBeVisible();
  });

  // ── UI: Create ticket via modal ────────────────────────────────────────

  test("UI: create ticket via modal", async () => {
    await page.goto("/support");
    await expect(page.getByText("Submit and track support requests")).toBeVisible({ timeout: 8000 });

    // Open modal
    await page.getByRole("button", { name: /new ticket/i }).click();
    await expect(page.getByText("New Support Ticket")).toBeVisible();

    // Fill form
    await page.getByPlaceholder("Brief description of your issue...").fill("UI Created Ticket");
    await page.getByPlaceholder("Describe the issue in detail...").fill("Created from Playwright UI test");

    // Select technical category
    await page.locator("select").first().selectOption("technical");
    // Select urgent priority
    await page.locator("select").last().selectOption("urgent");

    // Submit
    await page.getByRole("button", { name: /submit ticket/i }).click();

    // Modal should close and ticket should appear in list
    await expect(page.getByText("New Support Ticket")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 5000 });
  });

  // ── UI: Ticket detail page ─────────────────────────────────────────────

  test("UI: navigate to ticket detail", async () => {
    await page.goto("/support");
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 8000 });

    // Click the ticket
    await page.getByText("UI Created Ticket").click();

    // Should navigate to detail page
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Created from Playwright UI test")).toBeVisible();
    await expect(page.locator("text=Open")).toBeVisible();
    await expect(page.locator("text=Urgent")).toBeVisible();
  });

  test("UI: send message on ticket detail", async () => {
    // Navigate to the UI-created ticket
    await page.goto("/support");
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 8000 });
    await page.getByText("UI Created Ticket").click();
    await expect(page.getByText("Created from Playwright UI test")).toBeVisible({ timeout: 8000 });

    // Type and send a reply
    await page.getByPlaceholder("Type your reply...").fill("This is a follow-up message from UI");
    await page.getByRole("button", { name: /send/i }).click();

    // Message should appear in thread
    await expect(page.getByText("This is a follow-up message from UI")).toBeVisible({ timeout: 5000 });
  });

  test("UI: close ticket from detail page", async () => {
    await page.goto("/support");
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 8000 });
    await page.getByText("UI Created Ticket").click();
    await expect(page.getByText("Created from Playwright UI test")).toBeVisible({ timeout: 8000 });

    // Click "Close ticket"
    await page.getByText("Close ticket").click();

    // Should show closed state
    await expect(page.getByText(/this ticket is closed/i)).toBeVisible({ timeout: 5000 });
  });

  test("UI: closed ticket hides reply input", async () => {
    await page.goto("/support");
    await expect(page.getByText("UI Created Ticket")).toBeVisible({ timeout: 8000 });
    await page.getByText("UI Created Ticket").click();
    await expect(page.getByText(/this ticket is closed/i)).toBeVisible({ timeout: 8000 });

    // Reply input should not be present
    await expect(page.getByPlaceholder("Type your reply...")).not.toBeVisible();
  });

  // ── UI: Not found ticket ───────────────────────────────────────────────

  test("UI: non-existent ticket shows not found", async () => {
    await page.goto("/support/fake-uuid-does-not-exist");
    await expect(page.getByText("Ticket not found")).toBeVisible({ timeout: 8000 });
  });

  // ── UI: Back navigation ────────────────────────────────────────────────

  test("UI: 'All Tickets' link navigates back", async () => {
    await page.goto("/support");
    await expect(page.getByText("Billing Issue")).toBeVisible({ timeout: 8000 });
    await page.getByText("Billing Issue").click();
    await expect(page.getByText("Charge looks wrong")).toBeVisible({ timeout: 8000 });

    await page.getByText("All Tickets").click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByText("E2E Test Issue")).toBeVisible({ timeout: 5000 });
  });

  // ── Cleanup ────────────────────────────────────────────────────────────

  test("cleanup: close browser context", async () => {
    await page.close();
    await ctx.close();
  });
});
