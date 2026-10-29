import { expect, test } from "@playwright/test";

const measurementId = "G-XW154R1G8Y";
const consent = JSON.stringify({ version: "2026-09-02", analytics: false, marketing: false });

test("loads the configured GA4 tag when analytics is enabled", async ({ page }) => {
  const tagRequest = page.waitForRequest((request) =>
    request.url().includes(`googletagmanager.com/gtag/js?id=${measurementId}`),
  );

  await page.goto("/");
  await tagRequest;

  await expect(page.locator("#uncoil-google-analytics")).toHaveCount(1);
});

test("does not load Google Analytics after analytics is rejected", async ({ page }) => {
  const tagRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("googletagmanager.com/gtag/js")) tagRequests.push(request.url());
  });
  await page.addInitScript((storedConsent) => {
    window.localStorage.setItem("uncoil.consent", storedConsent);
  }, consent);

  await page.goto("/");
  await page.waitForTimeout(500);

  expect(tagRequests).toEqual([]);
  await expect(page.locator("#uncoil-google-analytics")).toHaveCount(0);
});
