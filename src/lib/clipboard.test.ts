import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());

describe("copyText", () => {
  it("reports success when the clipboard accepts the text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("key")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("key");
  });

  it("reports failure instead of throwing when the clipboard is blocked or missing", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) } });
    await expect(copyText("key")).resolves.toBe(false);
    vi.stubGlobal("navigator", {});
    await expect(copyText("key")).resolves.toBe(false);
  });
});
