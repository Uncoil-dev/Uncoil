import { describe, expect, it } from "vitest";
import { probeFailureMessage } from "./connection-check";

describe("probeFailureMessage", () => {
  it("tells people to copy the key again or make a new one on 401", () => {
    expect(probeFailureMessage(401)).toMatch(/copy the key again or make a new one/i);
  });

  it("explains that a 403 key was paused and needs replacing", () => {
    expect(probeFailureMessage(403)).toMatch(/paused.*make a new one/i);
  });

  it("asks people to wait on 429", () => {
    expect(probeFailureMessage(429)).toMatch(/wait a minute/i);
  });

  it("owns server errors", () => {
    for (const status of [500, 502, 503]) expect(probeFailureMessage(status)).toMatch(/on our side.*try again/i);
  });

  it("never shows a bare status code", () => {
    for (const status of [400, 401, 403, 404, 429, 500]) expect(probeFailureMessage(status)).not.toMatch(/HTTP \d{3}/);
  });

  it("keeps the server's reason for other statuses", () => {
    expect(probeFailureMessage(422, "Invalid span payload")).toContain("Invalid span payload");
  });
});
