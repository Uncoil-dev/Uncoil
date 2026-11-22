import { afterEach, describe, expect, it } from "vitest";
import { ConvexHttpClient } from "convex/browser";
import { getConvexClient } from "./convex";

const original = process.env.NEXT_PUBLIC_CONVEX_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
  else process.env.NEXT_PUBLIC_CONVEX_URL = original;
});

describe("getConvexClient", () => {
  it("throws when the deployment URL is not configured", () => {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    expect(() => getConvexClient()).toThrow("NEXT_PUBLIC_CONVEX_URL is not set");
  });

  it("throws when the deployment URL is empty", () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "";
    expect(() => getConvexClient()).toThrow("NEXT_PUBLIC_CONVEX_URL is not set");
  });

  it("returns an HTTP client bound to the configured URL", () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example-123.convex.cloud";
    const client = getConvexClient();
    expect(client).toBeInstanceOf(ConvexHttpClient);
    expect(client.url).toBe("https://example-123.convex.cloud");
  });

  it("creates a fresh client on each call", () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example-123.convex.cloud";
    expect(getConvexClient()).not.toBe(getConvexClient());
  });
});
