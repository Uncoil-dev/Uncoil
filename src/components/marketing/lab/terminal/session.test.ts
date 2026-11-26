import { describe, expect, it } from "vitest";
import { EXPLANATION, HERO_SESSION, frameAt, totalMs, typed, type Step } from "./session";

const steps: Step[] = [
  { k: "prompt", text: "hello", phase: "setup", ms: 1000, rest: 500 },
  { k: "verdict", status: "fail", text: "FAILED", phase: "failed", ms: 0, rest: 1000 },
  { k: "verdict", status: "pass", text: "PASSED", phase: "passed", ms: 200 },
];

describe("frameAt", () => {
  it("walks through typing, resting and finishing", () => {
    expect(frameAt(steps, 0)).toEqual({ shown: 0, progress: 0, phase: "setup", done: false });
    expect(frameAt(steps, 500)).toMatchObject({ shown: 0, progress: 0.5 });
    expect(frameAt(steps, 1200)).toMatchObject({ shown: 1, progress: 0, phase: "setup" });
    // A zero-length step appears at once and holds its phase during its rest.
    expect(frameAt(steps, 1500)).toMatchObject({ shown: 2, phase: "failed", done: false });
    expect(frameAt(steps, totalMs(steps))).toMatchObject({ shown: 3, phase: "passed", done: true });
  });
});

describe("typed", () => {
  it("never splits a character made of two code units", () => {
    expect(typed("a→b", 0.5)).toBe("a→");
    expect(typed("ab😀", 1)).toBe("ab😀");
    expect(typed("ab😀", 0.9)).toBe("ab😀");
    expect(typed("ab😀", 0.5)).toBe("ab");
  });
});

describe("hero session", () => {
  it("explains the failure with the trace viewer's own wording and ends passed", () => {
    expect(EXPLANATION.stepName).toBe("refund.issue");
    expect(EXPLANATION.sentence1).toContain("timed out after 5.0s");
    expect(frameAt(HERO_SESSION, totalMs(HERO_SESSION)).phase).toBe("passed");
    expect(HERO_SESSION.filter((s) => s.k === "verdict" && s.status === "fail")).toHaveLength(1);
  });
});
