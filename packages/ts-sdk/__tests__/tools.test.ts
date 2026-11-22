import { beforeEach, describe, expect, it, vi } from "vitest";
import { UncoilClient } from "../src/index";
import { traceTools } from "../src/integrations/tools";

const all: any[] = [];
// Outside a trace each call also emits an implicit root span; assert on the tool spans only.
const spans = () => all.filter((r) => !r.metadata?.implicitRoot);
const telemetry = new UncoilClient({ apiKey: "test-key" });
telemetry.ingest = vi.fn(async (data: any) => {
  all.push({ ...data });
});
beforeEach(() => all.splice(0));

describe("traceTools", () => {
  it("keeps keys and results while recording a tool span per call", async () => {
    const tools = traceTools(
      { add: (a: number, b: number) => a + b, lookup: async (q: string) => `found ${q}` },
      { client: telemetry },
    );
    expect(Object.keys(tools)).toEqual(["add", "lookup"]);
    expect(tools.add(2, 3)).toBe(5);
    expect(await tools.lookup("x")).toBe("found x");
    expect(spans()).toHaveLength(2);
    expect(spans()[0]).toMatchObject({ spanType: "tool_call", toolName: "add", input: [2, 3], output: 5 });
    expect(spans()[1]).toMatchObject({ toolName: "lookup", input: "x", output: "found x" });
  });

  it("wraps execute on tool objects without mutating the original", async () => {
    const original = { description: "d", execute: vi.fn(async function (this: any, i: any) { return `${this.description}:${i.q}`; }) };
    const { search } = traceTools({ search: original }, { client: telemetry });
    expect(search).not.toBe(original);
    expect(search.description).toBe("d");
    expect(await search.execute({ q: "a" })).toBe("d:a");
    expect(original.execute).toHaveBeenCalledTimes(1);
    expect(spans()[0]).toMatchObject({ toolName: "search", output: "d:a" });
  });

  it("passes through values that are not tools", () => {
    const value = { name: "config" };
    expect(traceTools({ value, n: 1 }, { client: telemetry })).toEqual({ value, n: 1 });
    expect(spans()).toHaveLength(0);
  });

  it("rethrows sync and async errors unchanged and records them", async () => {
    const boom = new TypeError("sync boom");
    const bad = new RangeError("async boom");
    const tools = traceTools(
      { s: () => { throw boom; }, a: async () => { throw bad; } },
      { client: telemetry },
    );
    expect(() => tools.s()).toThrow(boom);
    await expect(tools.a()).rejects.toBe(bad);
    expect(spans()[0]).toMatchObject({ errorType: "TypeError", errorMessage: "sync boom" });
    expect(spans()[1]).toMatchObject({ errorType: "RangeError", errorMessage: "async boom" });
  });

  it("honors captureInput and captureOutput", () => {
    const tools = traceTools({ f: (s: string) => s }, { client: telemetry, captureInput: false, captureOutput: false });
    expect(tools.f("secret")).toBe("secret");
    expect(spans()[0]).toMatchObject({ input: "[not captured]", output: "[not captured]" });
  });
});
