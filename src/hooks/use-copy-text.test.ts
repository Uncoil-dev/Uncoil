import { describe, expect, it } from "vitest";
import { copyLabel, writeClipboard } from "./use-copy-text";

describe("writeClipboard", () => {
  it("is true only when the text reached the clipboard", async () => {
    const written: string[] = [];
    expect(await writeClipboard({ writeText: async (text) => void written.push(text) }, "Answer in {{tone}}.")).toBe(true);
    expect(written).toEqual(["Answer in {{tone}}."]);
    expect(await writeClipboard({ writeText: () => Promise.reject(new DOMException("blocked", "NotAllowedError")) }, "x")).toBe(false);
    expect(await writeClipboard(undefined, "x")).toBe(false);
  });
});

describe("copyLabel", () => {
  it("shows Copied, Copy failed, or the button's own text", () => {
    expect(copyLabel("copied", "Copy text")).toBe("Copied");
    expect(copyLabel("failed", "Copy text")).toBe("Copy failed");
    expect(copyLabel("idle", "Copy text")).toBe("Copy text");
  });
});
