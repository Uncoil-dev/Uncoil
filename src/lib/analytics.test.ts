import { afterEach, expect, test } from "vitest";
import posthog from "posthog-js";
import { captureAnalytics } from "./analytics.ts";
import { CONSENT_KEY, CONSENT_VERSION } from "./consent.ts";

type Captured = [string, Record<string, unknown> | undefined];

function stubCapture(): Captured[] {
  const calls: Captured[] = [];
  (posthog as unknown as { capture: unknown }).capture = (event: string, properties?: Record<string, unknown>) => {
    calls.push([event, properties]);
  };
  return calls;
}

function installWindow(stored: string | null) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: (key: string) => (key === CONSENT_KEY ? stored : null) } },
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
});

test("does nothing when window is unavailable", () => {
  const calls = stubCapture();
  Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
  captureAnalytics("page_view");
  expect(calls).toEqual([]);
});

test("captures with default consent when nothing is stored", () => {
  const calls = stubCapture();
  installWindow(null);
  captureAnalytics("page_view", { path: "/pricing" });
  expect(calls).toEqual([["page_view", { path: "/pricing" }]]);
});

test("passes event name through and leaves properties undefined when omitted", () => {
  const calls = stubCapture();
  installWindow(null);
  captureAnalytics("cta_click");
  expect(calls.length).toBe(1);
  expect(calls[0][0]).toBe("cta_click");
  expect(calls[0][1]).toBe(undefined);
});

test("skips capture when analytics consent is withdrawn", () => {
  const calls = stubCapture();
  installWindow(JSON.stringify({ version: CONSENT_VERSION, analytics: false, marketing: false }));
  captureAnalytics("page_view", { path: "/" });
  expect(calls).toEqual([]);
});

test("captures when analytics consent is granted", () => {
  const calls = stubCapture();
  installWindow(JSON.stringify({ version: CONSENT_VERSION, analytics: true, marketing: false }));
  captureAnalytics("signup_start");
  expect(calls.length).toBe(1);
});

test("malformed stored consent falls back to the default", () => {
  const calls = stubCapture();
  installWindow("not-json");
  captureAnalytics("page_view");
  expect(calls.length).toBe(1);
});
