import { describe, expect, it } from "vitest";
import { ORG_PROFILES } from "./about";

describe("ORG_PROFILES", () => {
  it("lists the public profile URLs in a stable order", () => {
    expect(ORG_PROFILES).toEqual([
      "https://github.com/Uncoil-dev/Uncoil",
      "https://www.npmjs.com/package/@uncoil.dev/sdk",
      "https://pypi.org/project/uncoil-sdk/",
    ]);
  });

  it("contains only unique, valid https URLs", () => {
    expect(new Set(ORG_PROFILES).size).toBe(ORG_PROFILES.length);
    for (const url of ORG_PROFILES) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });
});
