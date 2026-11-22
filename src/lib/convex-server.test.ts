import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();
const setAuth = vi.fn();
const ctor = vi.fn();

vi.mock("@/lib/auth-server", () => ({ getToken: () => getToken() }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth = setAuth;
    constructor(url: string) {
      ctor(url);
    }
  },
}));

import { getAuthedConvexClient } from "@/lib/convex-server";

describe("getAuthedConvexClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when the Convex URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    getToken.mockResolvedValue("tok");
    await expect(getAuthedConvexClient()).rejects.toThrow("NEXT_PUBLIC_CONVEX_URL is not set");
    expect(ctor).not.toHaveBeenCalled();
  });

  it("creates a client for the configured URL and applies the token", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    getToken.mockResolvedValue("tok");
    await getAuthedConvexClient();
    expect(ctor).toHaveBeenCalledWith("https://example.convex.cloud");
    expect(setAuth).toHaveBeenCalledWith("tok");
  });

  it("skips setAuth when there is no token", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    getToken.mockResolvedValue(undefined);
    await getAuthedConvexClient();
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(setAuth).not.toHaveBeenCalled();
  });
});
