import { describe, expect, it } from "vitest";
import {
  PAYLOAD_COLLAPSE_THRESHOLD,
  PAYLOAD_PREVIEW_CHARS,
  isLargePayload,
  payloadPreview,
  payloadSizeLabel,
} from "./collapsible-payload.helpers";

describe("collapsible payload helpers", () => {
  it("collapses only text above the threshold", () => {
    expect(isLargePayload("x".repeat(PAYLOAD_COLLAPSE_THRESHOLD))).toBe(false);
    expect(isLargePayload("x".repeat(PAYLOAD_COLLAPSE_THRESHOLD + 1))).toBe(true);
  });

  it("cuts the preview to the preview length and leaves short text alone", () => {
    expect(payloadPreview("x".repeat(5_000))).toHaveLength(PAYLOAD_PREVIEW_CHARS);
    expect(payloadPreview("short")).toBe("short");
  });

  it("labels sizes in bytes, KB and MB using UTF-8 bytes", () => {
    expect(payloadSizeLabel("abc")).toBe("3 B");
    expect(payloadSizeLabel("é".repeat(600))).toBe("1.2 KB");
    expect(payloadSizeLabel("x".repeat(1_258_291))).toBe("1.2 MB");
  });
});
