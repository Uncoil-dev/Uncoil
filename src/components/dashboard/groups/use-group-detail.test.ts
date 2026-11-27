import { describe, expect, it } from "vitest";
import { copyLabel, writeClipboard } from "./use-group-detail";

describe("writeClipboard", () => {
  it("reports whether the text reached the clipboard", async () => {
    const written: string[] = [];
    expect(await writeClipboard({ writeText: async (text) => void written.push(text) }, "sess_1")).toBe(true);
    expect(written).toEqual(["sess_1"]);
    expect(await writeClipboard({ writeText: () => Promise.reject(new DOMException("blocked", "NotAllowedError")) }, "sess_1")).toBe(false);
    expect(await writeClipboard(undefined, "sess_1")).toBe(false);
  });
});

describe("copyLabel", () => {
  it("shows Copied or Copy failed only on the button that was pressed", () => {
    expect(copyLabel({ label: "id", ok: true }, "id", "Copy id")).toBe("Copied");
    expect(copyLabel({ label: "id", ok: false }, "id", "Copy id")).toBe("Copy failed");
    expect(copyLabel({ label: "id", ok: false }, "link", "Copy link")).toBe("Copy link");
    expect(copyLabel(null, "id", "Copy id")).toBe("Copy id");
  });
});
