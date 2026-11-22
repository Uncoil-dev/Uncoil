import { afterEach, describe, expect, it, vi } from "vitest";
import { appHref } from "./app-links";
import { getAvailableRegions } from "./regions";

describe("appHref", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the relative path outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND", "");
    expect(appHref("/sign-up")).toBe("/sign-up");
  });

  it("keeps the relative path on the cloud host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND", "cloud");
    expect(appHref("/dashboard")).toBe("/dashboard");
  });

  it("points at the regional origin on the marketing host when one region is offered", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND", "marketing");
    const regions = getAvailableRegions();
    const expected = regions.length === 1 ? `${regions[0].origin}/demo/project` : "/demo/project";
    expect(appHref("/demo/project")).toBe(expected);
  });
});
