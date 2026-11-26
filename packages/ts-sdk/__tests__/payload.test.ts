import { describe, expect, it } from "vitest";
import { integrationPayload, MAX_PAYLOAD_CHARS } from "../src/index";

describe("integrationPayload", () => {
  it("turns null and undefined into an empty string", () => {
    expect(integrationPayload(null)).toBe("");
    expect(integrationPayload(undefined)).toBe("");
  });

  it("serialises objects to JSON", () => {
    expect(integrationPayload({ q: "hi", n: 2 })).toBe('{"q":"hi","n":2}');
  });

  it("masks bearer tokens", () => {
    const token = "t".repeat(24);
    expect(integrationPayload(`Authorization: Bearer ${token}`)).toBe("Authorization: [redacted]");
  });

  it("masks sk- style keys", () => {
    const key = ["sk", "proj", "x".repeat(22)].join("-");
    expect(integrationPayload(`key ${key} done`)).toBe("key [redacted] done");
  });

  it("masks JWT-like strings", () => {
    // Built at runtime so no token-shaped literal sits in the source.
    const jwt = ["eyJ" + "a".repeat(17), "eyJ" + "b".repeat(30), "c".repeat(16)].join(".");
    expect(integrationPayload(`token=${jwt}`)).not.toContain("eyJ");
    expect(integrationPayload(`jwt ${jwt} end`)).toBe("jwt [redacted] end");
  });

  it("masks secret fields inside serialised objects", () => {
    expect(integrationPayload({ password: "hunter2hunter2" })).toBe('{"password":"[redacted]"}');
  });

  it("leaves text at the cap untouched", () => {
    const text = "a".repeat(MAX_PAYLOAD_CHARS);
    expect(integrationPayload(text)).toBe(text);
  });

  it("cuts text over the cap and notes how many chars were dropped", () => {
    const extra = 37;
    const result = integrationPayload("a".repeat(MAX_PAYLOAD_CHARS + extra));
    expect(result.startsWith("a".repeat(MAX_PAYLOAD_CHARS))).toBe(true);
    expect(result.slice(MAX_PAYLOAD_CHARS)).toBe(`… [truncated ${extra} chars]`);
  });
});
