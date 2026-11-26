import { describe, expect, it } from "vitest";
import { resolveSettingsTab } from "./settings-tabs";

const tabs = ["General", "Members", "Data", "API Keys", "Audit log"];

describe("resolveSettingsTab", () => {
  it("matches a tab name regardless of case", () => {
    expect(resolveSettingsTab("members", tabs)).toBe("Members");
    expect(resolveSettingsTab("api keys", tabs)).toBe("API Keys");
    expect(resolveSettingsTab("Audit Log", tabs)).toBe("Audit log");
  });

  it("falls back to General for a missing or unknown tab", () => {
    expect(resolveSettingsTab(null, tabs)).toBe("General");
    expect(resolveSettingsTab("billing", tabs)).toBe("General");
  });
});
