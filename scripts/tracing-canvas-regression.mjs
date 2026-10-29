// Checks the Tracing page features from docs/dashboard-page-standard.md on a preview, signed in as the robot.
// Secrets come from env and are never printed. Screenshots go to OUT_DIR.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";

const BASE = process.env.PREVIEW_URL;
const PROJECT = process.env.UNCOIL_E2E_PROJECT_ID;
const OUT = process.env.OUT_DIR ?? "/tmp/tracing-canvas-regression";
const STATE = process.env.PREVIEW_STATE_FILE;
if (!BASE || !PROJECT) throw new Error("Set PREVIEW_URL and UNCOIL_E2E_PROJECT_ID.");
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
let failed = 0;
async function check(label, fn) {
  try { const note = await fn(); console.log(`PASS ${label}${note ? `: ${note}` : ""}`); }
  catch (error) { failed++; console.log(`FAIL ${label}: ${String(error.message).split("\n")[0].slice(0, 180)}`); }
}
const expect = (ok, message) => { if (!ok) throw new Error(message); };
function viewportTransform(style) {
  const match = style.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (!match) throw new Error(`could not read canvas transform: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3]) };
}

async function checkMinimap(canvas) {
  // The minimap is an opt-in overlay; switch it on from the canvas controls.
  const open = canvas.getByRole("button", { name: "Show minimap", exact: true });
  if (await open.count()) await open.click();
  const viewport = canvas.locator(".react-flow__viewport");
  const miniatureCount = await canvas.locator(".react-flow__minimap-node").count();
  const cardCount = await canvas.locator(".react-flow__node").count();
  expect(miniatureCount === cardCount && miniatureCount > 0, `minimap is blank or incomplete: ${miniatureCount}/${cardCount} nodes`);
  const mini = canvas.locator(".react-flow__minimap-svg");
  await mini.scrollIntoViewIfNeeded();
  const box = await mini.boundingBox();
  const point = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.3 };
  const world = await mini.evaluate((svg, p) => {
    const local = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM().inverse());
    return { x: local.x, y: local.y, tolerance: 1 / svg.getScreenCTM().a };
  }, point);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(350);
  const clicked = viewportTransform(await viewport.getAttribute("style"));
  const paneBox = await canvas.locator(".react-flow").boundingBox();
  const center = { x: (paneBox.width / 2 - clicked.x) / clicked.zoom, y: (paneBox.height / 2 - clicked.y) / clicked.zoom };
  expect(Math.abs(center.x - world.x) <= world.tolerance && Math.abs(center.y - world.y) <= world.tolerance, `minimap click center ${center.x.toFixed(1)},${center.y.toFixed(1)} vs world ${world.x.toFixed(1)},${world.y.toFixed(1)}; point ${point.x.toFixed(0)},${point.y.toFixed(0)}`);
  // Wait until no fullscreen/fit animation can masquerade as minimap movement.
  await page.waitForTimeout(200);
  const before = viewportTransform(await viewport.getAttribute("style"));
  expect(Math.abs(before.x - clicked.x) < 0.1 && Math.abs(before.y - clicked.y) < 0.1, "viewport still animating before minimap drag");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 12, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = viewportTransform(await viewport.getAttribute("style"));
  expect(after.x < before.x - 5 && after.y < before.y - 5, "minimap drag did not move the visible area right/down");
  expect(Math.abs(after.zoom - before.zoom) < 0.001, "minimap drag unexpectedly changed zoom");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  const wheel = viewportTransform(await viewport.getAttribute("style"));
  expect(wheel.zoom > after.zoom, "minimap wheel did not zoom the canvas");
  return "click centers the world point, drag moves right/down from a stable view, wheel zooms";
}

async function checkCardsAndLines(canvas) {
  // Start and end cards frame a Flow graph; only step cards carry a name and an accessible label.
  const cards = canvas.locator(".react-flow__node[aria-label]");
  const names = await cards.evaluateAll((nodes) => nodes.map((node) => node.querySelector(".truncate[title]")?.textContent));
  expect(names.length > 0 && names.every((name) => name && name.trim().length > 0), "node text disappeared or became a bubble");
  // Forward connectors are straight; dashed loop arrows (Flow's back-edges) are allowed to curve.
  const paths = await canvas.locator(".react-flow__edge-path").evaluateAll((edges) => edges.filter((edge) => !/dasharray/.test(edge.getAttribute("style") ?? "")).map((edge) => edge.getAttribute("d")));
  expect(paths.length > 0 && paths.every((path) => !/[CQAST]/i.test(path)), "connector still has curved segments");
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  ...(STATE && existsSync(STATE) ? { storageState: STATE } : {}), viewport: { width: 1440, height: 900 }, hasTouch: true, acceptDownloads: true,
  extraHTTPHeaders: { ...bypass, "x-vercel-set-bypass-cookie": "true" },
});
await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const url = `${BASE}/dashboard/${PROJECT}/tracing?range=30d`;

await check("sign in and load Tracing", async () => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const needsLogin = await Promise.race([
    page.locator("#auth-email-address").waitFor({ timeout: 15_000 }).then(() => true),
    page.getByRole("heading", { name: "Tracing" }).waitFor({ timeout: 15_000 }).then(() => false),
  ]).catch(() => true);
  if (needsLogin) {
    await page.goto(`${BASE}/sign-in?redirect_url=${encodeURIComponent(`/dashboard/${PROJECT}/tracing`)}`, { waitUntil: "domcontentloaded" });
    const consent = page.getByRole("button", { name: /reject optional/i });
    if (await consent.isVisible().catch(() => false)) await consent.click();
    await page.locator("#auth-email-address").fill(process.env.UNCOIL_ROBOT_EMAIL);
    await page.locator("#auth-password").fill(process.env.UNCOIL_ROBOT_PASSWORD);
    await page.locator("#auth-password").press("Enter");
    await page.waitForURL(/\/dashboard\//, { timeout: 30_000 });
    if (STATE) await context.storageState({ path: STATE });
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
  await page.locator("tbody tr").first().waitFor({ timeout: 30_000 });
});


async function checkArrowPan(canvas) {
  const path = canvas.locator(".react-flow__edge-path").first();
  await path.scrollIntoViewIfNeeded();
  const box = await path.boundingBox();
  const viewport = canvas.locator(".react-flow__viewport");
  const before = viewportTransform(await viewport.getAttribute("style"));
  const url = page.url();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = viewportTransform(await viewport.getAttribute("style"));
  expect(after.x > before.x + 45 && after.y > before.y + 25, "drag starting on an arrow did not pan");
  expect(page.url() === url, "arrow drag changed the selected filter");
}

async function verifyCanvas(canvas, name) {
  const controls = canvas.getByRole("group", { name: "Canvas controls" });
  const viewport = canvas.locator(".react-flow__viewport");
  await canvas.locator(".react-flow__node").first().waitFor();
  await page.waitForTimeout(700);
  // Leave room to exercise wheel zoom even for a tiny trace initially fitted to 400%.
  while (viewportTransform(await viewport.getAttribute("style")).zoom > 2) {
    await controls.getByRole("button", { name: "Zoom out", exact: true }).click();
    await page.waitForTimeout(220);
  }
  await check(`${name}: populated minimap, click geometry, directional drag and wheel`, () => checkMinimap(canvas));
  while (viewportTransform(await viewport.getAttribute("style")).zoom > 0.6) {
    await controls.getByRole("button", { name: "Zoom out", exact: true }).click();
    await page.waitForTimeout(220);
  }
  await check(`${name}: text persists below the former bubble threshold; straight paths`, () => checkCardsAndLines(canvas));
  await page.screenshot({ path: `${OUT}/${name}-desktop-zoom-out.png` });
  await controls.getByRole("button", { name: "Fit to view", exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-desktop-fit.png` });
  await check(`${name}: drag starting on an arrow pans without selecting`, () => checkArrowPan(canvas));
  while (viewportTransform(await viewport.getAttribute("style")).zoom < 2) {
    await controls.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForTimeout(220);
  }
  await page.screenshot({ path: `${OUT}/${name}-desktop-zoom-in.png` });
  await controls.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-desktop-fullscreen.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
}
await page.locator("tbody tr").first().click();
const panel = page.getByRole("complementary", { name: "Trace detail" });
await panel.getByRole("tab", { name: "Graph", exact: true }).click();
await verifyCanvas(panel.getByRole("group", { name: "Step graph" }), "graph");
await page.setViewportSize({ width: 390, height: 844 });
await panel.getByRole("group", { name: "Step graph" }).getByRole("button", { name: "Fit to view", exact: true }).click();
await page.waitForTimeout(700);
await check("phone graph: controls and minimap fit inside the visible pane", async () => {
  const pane = await panel.locator("#trace-view").boundingBox();
  const graph = panel.getByRole("group", { name: "Step graph" });
  const toggle = graph.getByRole("button", { name: "Show minimap", exact: true });
  if (await toggle.count()) await toggle.click();
  const controls = await graph.getByRole("group", { name: "Canvas controls" }).boundingBox();
  const mini = await graph.locator(".react-flow__minimap").boundingBox();
  for (const box of [controls, mini]) expect(box.y >= pane.y && box.y + box.height <= pane.y + pane.height && box.x >= pane.x && box.x + box.width <= pane.x + pane.width, "phone canvas overlay is clipped");
  expect(mini.y + mini.height <= controls.y || mini.x + mini.width <= controls.x, "phone minimap overlaps controls");
});
await page.screenshot({ path: `${OUT}/graph-phone-fit.png` });
await browser.close();
process.exitCode = failed ? 1 : 0;
