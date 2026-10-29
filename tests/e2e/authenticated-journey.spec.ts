import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("authenticated journey", () => {
test.skip(process.env.UNCOIL_E2E_AUTH !== "1", "Set UNCOIL_E2E_AUTH=1 with a cloud-auth test host to run the live journey.");

test("authenticated onboarding to investigation journey", async ({ page, request }) => {
  test.setTimeout(120_000);

  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  const identity = `playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${identity}@example.test`;
  const credential = process.env.UNCOIL_E2E_PASSWORD ?? randomUUID();
  let apiKey = "";
  let projectId = "";
  let runId = "";

  await test.step("create an isolated account through the existing auth flow", async () => {
    // The local cloud dev host already represents the EU deployment. Bypass the
    // marketing region selector so this test never leaves the local server.
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/\/sign-up$/);
    await page.getByLabel("Full name").fill("Playwright QA");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(credential);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding(?:\/project)?(?:\?|$)/, { timeout: 30_000 });
  });

  await test.step("create a project and use its real onboarding key", async () => {
    await page.goto("/onboarding/project");
    await expect(page.getByRole("heading", { name: "Create your first project." })).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Project name").fill(`Playwright QA ${identity}`);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/onboarding\/api-key$/, { timeout: 30_000 });
    apiKey = (await page.getByText(/^uncoil_sk_live_/).textContent())?.trim() ?? "";
    expect(apiKey).toMatch(/^uncoil_sk_live_/);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(page.url()).origin });
    await page.getByRole("button", { name: "Copy key" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/install$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "I'm ready" }).click();
    await expect(page).toHaveURL(/\/onboarding\/waiting$/, { timeout: 30_000 });
  });

  await test.step("ingest the first trace through the real ingest endpoint", async () => {
    const ingestRunId = `playwright-${Date.now()}`;
    const response = await request.post("/api/ingest", {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      data: {
        spanId: `${ingestRunId}-span`,
        runId: ingestRunId,
        spanType: "run_end",
        createdAt: new Date().toISOString(),
        latencyMs: 1,
        input: "Playwright authenticated journey",
        output: "First trace accepted",
        traceName: "playwright-authenticated-journey",
        environment: "playwright",
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(page).toHaveURL(/\/onboarding\/success\?projectId=[^&]+&runId=.+/, { timeout: 90_000 });
    const url = new URL(page.url());
    projectId = url.searchParams.get("projectId") ?? "";
    runId = url.searchParams.get("runId") ?? "";
    expect(projectId).not.toBe("");
    expect(runId).not.toBe("");
  });

  await test.step("open the authenticated dashboard and confirm the run is listed", async () => {
    await page.goto(`/dashboard/${projectId}`);
    await expect(page.getByRole("heading", { name: /Workspace health/i })).toBeVisible({ timeout: 30_000 });
    await page.goto(`/dashboard/${projectId}/runs`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectId}/runs(?:\\?.*)?$`));
    await expect(page.getByRole("link", { name: runId, exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: runId, exact: true }).click();
  });

  await test.step("open Trace Viewer and Investigation Mode for the selected run", async () => {
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectId}/runs/${runId}$`), { timeout: 30_000 });
    await expect(page.getByText("Run control")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Journey", exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Journey", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectId}/journey/${runId}$`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Agent Journey" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Full trace", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectId}/runs/${runId}$`), { timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Investigate", exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Investigate", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/${projectId}/investigate\\?run=${runId}$`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Investigation Mode" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Trace to investigate")).toHaveValue(runId);
  });

  expect(pageErrors, "the authenticated journey should not produce page errors").toEqual([]);
});
});
