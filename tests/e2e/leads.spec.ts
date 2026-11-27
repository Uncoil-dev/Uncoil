import { expect, test } from "@playwright/test";

const validLead = { name: "Browser Test", email: `lead-${Date.now()}@example.com`, intent: "contact", message: "I want to understand a recent agent failure.", sourcePath: "/contact" };

test.describe("lead capture", () => {
  test("accepts a valid contact form submission", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}` });
    await page.goto("/contact");
    await page.getByLabel("Name").fill("Browser Test");
    await page.getByRole("textbox", { name: "Work email", exact: true }).fill(validLead.email);
    await page.getByLabel("What can we help with?").fill(validLead.message);
    const leadResponse = page.waitForResponse((response) => response.url().includes("/api/leads"));
    await page.getByRole("button", { name: "Send request" }).click();
    expect((await leadResponse).status()).toBe(200);
    await expect(page.getByText("Request received")).toBeVisible();
  });

  test("accepts the honeypot without creating a visible error", async ({ request }) => {
    const response = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.11" }, data: { ...validLead, website: "https://spam.invalid" } });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  test("rejects invalid and oversized submissions with a reason", async ({ request }) => {
    const missing = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.12" }, data: { email: "bad" } });
    expect(missing.status()).toBe(422);
    const oversized = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.13" }, data: { ...validLead, message: "x".repeat(4001) } });
    expect(oversized.status()).toBe(422);
    await expect(oversized.json()).resolves.toEqual({ error: "Message is too long (4000 characters max)" });
    const invalidEmail = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.15" }, data: { ...validLead, email: "not-an-email" } });
    expect(invalidEmail.status()).toBe(422);
    await expect(invalidEmail.json()).resolves.toEqual({ error: "Enter a valid email address" });
    const missingMessage = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.16" }, data: { name: "No message", email: "valid@example.com" } });
    expect(missingMessage.status()).toBe(422);
    const wrongShape = await request.post("/api/leads", { headers: { "x-forwarded-for": "203.0.113.17" }, data: ["not", "an", "object"] });
    expect(wrongShape.status()).toBe(422);
  });

  test("returns a stable success response for an immediate duplicate", async ({ request }) => {
    const headers = { "x-forwarded-for": "203.0.113.14" };
    const first = await request.post("/api/leads", { headers, data: validLead });
    const second = await request.post("/api/leads", { headers, data: validLead });
    expect(second.status()).toBe(first.status());
    if (first.status() < 500) await expect(second.json()).resolves.toEqual({ ok: true });
  });

  test("does not expose the admin inbox to unauthenticated users", async ({ page }) => {
    const response = await page.goto("/admin/leads");
    expect(response?.status()).toBeGreaterThanOrEqual(200);
    await expect(page).not.toHaveURL(/\/admin\/leads$/);
  });
});
