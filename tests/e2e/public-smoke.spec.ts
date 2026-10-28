import { expect, test } from "@playwright/test";

test("public product surfaces load", async ({ request }) => {
  for (const route of ["/", "/pricing", "/docs", "/integrations"]) {
    const response = await request.get(route);
    expect(response.ok(), `${route} should return a successful response`).toBeTruthy();
    expect((await response.text()).trim(), `${route} should return a body`).not.toBe("");
  }
});

test("sign-in route redirects safely when auth is unavailable", async ({ request }) => {
  const response = await request.get("/sign-in", { maxRedirects: 0 });
  expect([200, 301, 302, 307, 308]).toContain(response.status());
});

test("first visit shows consent and preference changes persist", async ({ page }) => {
  await page.goto("/robots.txt");
  await page.evaluate(() => window.localStorage.removeItem("uncoil.consent"));
  await page.goto("/", { waitUntil: "commit", timeout: 120_000 });
  await expect(page.getByRole("dialog", { name: "Privacy preferences" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Reject optional" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preferences" })).toBeVisible();
  await page.getByRole("button", { name: "Preferences" }).click();
  await page.getByRole("checkbox", { name: "Analytics" }).check();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(page.getByRole("dialog", { name: "Privacy preferences" })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Privacy preferences" })).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("uncoil.consent") ?? "null").analytics)).toBe(true);
});
