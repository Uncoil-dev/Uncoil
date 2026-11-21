import { describe, expect, it } from "vitest";
import { EDGE_SEPARATOR, facetValues, parseTraceFilters } from "./trace-filters";

const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const parse = (query = "") => parseTraceFilters(new URLSearchParams(query), NOW);

describe("facetValues", () => {
  it("returns undefined for empty input", () => {
    expect(facetValues(null)).toBeUndefined();
    expect(facetValues("")).toBeUndefined();
    expect(facetValues(",,")).toBeUndefined();
  });

  it("splits multiple values and removes duplicates", () => {
    expect(facetValues("a,b,a")).toEqual(["a", "b"]);
  });

  it("decodes each value individually so encoded commas survive", () => {
    expect(facetValues("a,b%2Cc")).toEqual(["a", "b,c"]);
  });

  it("drops values that are not valid URI encoding", () => {
    expect(facetValues("%E0%A4%A,ok")).toEqual(["ok"]);
  });

  it("caps value length and count", () => {
    expect(facetValues("x".repeat(300))?.[0]).toHaveLength(200);
    const many = Array.from({ length: 80 }, (_, i) => `v${i}`).join(",");
    expect(facetValues(many)).toHaveLength(50);
  });
});

describe("parseTraceFilters", () => {
  it("defaults to the last 24 hours ending at the injected now", () => {
    const filters = parse();
    expect(filters.toMs).toBe(NOW);
    expect(filters.fromMs).toBe(NOW - DAY);
    expect(filters.status).toBe("all");
    expect(filters.direction).toBe("desc");
    expect(filters.facets).toEqual({});
  });

  it("clamps a future end time to now", () => {
    expect(parse(`to=${NOW + DAY}`).toMs).toBe(NOW);
  });

  it("limits the range to 90 days", () => {
    expect(parse(`from=0`).fromMs).toBe(NOW - 90 * DAY);
  });

  it("keeps at least one minute between from and to", () => {
    const filters = parse(`from=${NOW}`);
    expect(filters.fromMs).toBe(NOW - 60_000);
  });

  it("ignores negative and non-numeric numbers", () => {
    const filters = parse("minLatencyMs=-5&maxLatencyMs=abc&minTokens=10");
    expect(filters.minLatencyMs).toBeUndefined();
    expect(filters.maxLatencyMs).toBeUndefined();
    expect(filters.minTokens).toBe(10);
  });

  it("parses multi-value facets and excluded facets", () => {
    const filters = parse("modelId=a,b&not_modelId=c&status=error");
    expect(filters.facets).toEqual({ modelId: ["a", "b"] });
    expect(filters.excludeFacets).toEqual({ modelId: ["c"] });
    expect(filters.status).toBe("error");
  });

  it("parses an edge with the separator", () => {
    const edge = `tool:search${EDGE_SEPARATOR}model:gpt`;
    expect(parse(`edge=${encodeURIComponent(edge)}`).edge).toEqual({ from: "tool:search", to: "model:gpt" });
  });

  it("rejects malformed edges", () => {
    const enc = encodeURIComponent;
    expect(parse(`edge=${enc("tool:a")}`).edge).toBeUndefined();
    expect(parse(`edge=${enc(`tool:a${EDGE_SEPARATOR}bad`)}`).edge).toBeUndefined();
    expect(parse(`edge=${enc(`tool:a${EDGE_SEPARATOR}tool:b${EDGE_SEPARATOR}tool:c`)}`).edge).toBeUndefined();
  });

  it("accepts start and end markers as edge ends", () => {
    const edge = `__start__${EDGE_SEPARATOR}__end__`;
    expect(parse(`edge=${encodeURIComponent(edge)}`).edge).toEqual({ from: "__start__", to: "__end__" });
  });
});
