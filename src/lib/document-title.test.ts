import { describe, expect, it } from "vitest";
import { setTemporaryTitle } from "./document-title";

describe("setTemporaryTitle", () => {
  it("sets the title and restores the previous one when undone", () => {
    const doc = { title: "Send your first run · Uncoil" };
    const restore = setTemporaryTitle(doc, "First run in · Uncoil");
    expect(doc.title).toBe("First run in · Uncoil");
    restore();
    expect(doc.title).toBe("Send your first run · Uncoil");
  });
});
