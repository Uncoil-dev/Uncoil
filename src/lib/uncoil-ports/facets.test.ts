import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// The barrel and its modules import siblings without extensions, which plain
// Node cannot resolve. A resolve hook maps them to the .ts files.
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("./") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const display = await import("./facetDisplay.ts");
const barrel = await import("./index.ts");
const { getFacetSummary, getFacetSummaryValue, rankFacetOptions, facetNameRank, rankFacetsByName } = display;

const cat = (over: Record<string, unknown> = {}) => ({
  type: "categorical",
  column: "status",
  isActive: false,
  value: [],
  options: ["ok", "error", "timeout"],
  ...over,
});

test("getFacetSummary: inactive categorical reads All, null when empty or single option", () => {
  assert.equal(getFacetSummary(cat() as never), "All");
  assert.equal(getFacetSummary(cat({ options: [] }) as never), null);
  assert.equal(getFacetSummary(cat({ options: ["ok"] }) as never), null);
});

test("getFacetSummary: partial selection on inactive facet", () => {
  assert.equal(getFacetSummary(cat({ value: ["error"] }) as never), "error");
  assert.equal(getFacetSummary(cat({ value: ["ok", "error"] }) as never), "2 selected");
  assert.equal(getFacetSummary(cat({ value: [""], options: ["", "a"] }) as never), "(empty)");
});

test("getFacetSummary: display labels are used", () => {
  const displayByValue = new Map([["error", "Failed"]]);
  assert.equal(getFacetSummary(cat({ value: ["error"], displayByValue }) as never), "Failed");
});

test("getFacetSummary: active categorical variants", () => {
  assert.equal(getFacetSummary(cat({ isActive: true, value: ["ok"] }) as never), "ok");
  assert.equal(getFacetSummary(cat({ isActive: true, value: ["ok", "error"] }) as never), "2 selected");
  assert.equal(getFacetSummary(cat({ isActive: true, value: [] }) as never), "filtered");
  assert.equal(
    getFacetSummary(cat({ isActive: true, operator: "none of", value: ["ok", "error"] }) as never),
    "not timeout",
  );
  assert.equal(
    getFacetSummary(cat({ isActive: true, operator: "none of", value: ["ok"] }) as never),
    "not 2 values",
  );
  assert.equal(
    getFacetSummary(cat({ isActive: true, operator: "any of", value: ["ok", "error", "timeout"] }) as never),
    "All",
  );
});

test("getFacetSummary: text filters", () => {
  const one = cat({ isActive: true, textFilters: [{ operator: "contains", value: "x" }] });
  assert.equal(getFacetSummary(one as never), 'contains "x"');
  const not = cat({ isActive: true, value: ["ok"], textFilters: [{ operator: "not", value: "y" }] });
  assert.equal(getFacetSummary(not as never), 'ok · not "y"');
  const many = cat({
    isActive: true,
    textFilters: [
      { operator: "contains", value: "a" },
      { operator: "not", value: "b" },
    ],
  });
  assert.equal(getFacetSummary(many as never), "2 text filters");
});

test("getFacetSummary: numeric, string and keyed facets", () => {
  assert.equal(getFacetSummary({ type: "numeric", isActive: false, value: [1, 2] }), null);
  assert.equal(getFacetSummary({ type: "numeric", isActive: true, value: [1, 5], unit: "ms" }), "1–5 ms");
  assert.equal(getFacetSummary({ type: "numeric", isActive: true, value: [0, 3] }), "0–3");
  assert.equal(getFacetSummary({ type: "string", isActive: false, value: "a" }), null);
  assert.equal(getFacetSummary({ type: "string", isActive: true, value: "abc" }), '"abc"');
  assert.equal(getFacetSummary({ type: "keyed", isActive: false, value: [] }), null);
  assert.equal(getFacetSummary({ type: "keyed", isActive: true, value: [{ key: "env" }] }), "env");
  assert.equal(
    getFacetSummary({ type: "keyed", isActive: true, value: [{ key: "a" }, { key: "b" }] }),
    "2 conditions",
  );
});

test("getFacetSummaryValue: single-value cases and nulls", () => {
  assert.equal(getFacetSummaryValue(cat({ value: ["ok"] }) as never), "ok");
  assert.equal(getFacetSummaryValue(cat() as never), null);
  assert.equal(getFacetSummaryValue(cat({ options: [], value: ["ok"] }) as never), null);
  assert.equal(getFacetSummaryValue(cat({ isActive: true, value: ["ok"] }) as never), "ok");
  assert.equal(getFacetSummaryValue(cat({ isActive: true, value: ["ok", "error"] }) as never), null);
  assert.equal(
    getFacetSummaryValue(cat({ isActive: true, operator: "none of", value: ["ok", "error"] }) as never),
    "timeout",
  );
  assert.equal(
    getFacetSummaryValue(cat({ isActive: true, value: ["ok"], textFilters: [{ operator: "contains", value: "o" }] }) as never),
    null,
  );
  assert.equal(getFacetSummaryValue({ type: "string", isActive: true, value: "a" }), null);
});

test("rankFacetOptions: prefix before substring, stable, empty and unknown inputs", () => {
  const options = ["my-error", "error", "timeout", "errand"];
  assert.deepEqual(rankFacetOptions(options, "err"), ["error", "errand", "my-error"]);
  assert.deepEqual(rankFacetOptions(options, ""), options);
  assert.deepEqual(rankFacetOptions(options, "zzz"), []);
  assert.deepEqual(rankFacetOptions([], "a"), []);
});

test("rankFacetOptions: matches display labels", () => {
  const displayByValue = new Map([["e1", "Failure"]]);
  assert.deepEqual(rankFacetOptions(["ok", "e1"], "fail", displayByValue), ["e1"]);
});

test("facetNameRank and rankFacetsByName", () => {
  const facet = { label: "Trace name", column: "traceName" };
  assert.equal(facetNameRank(facet, "trace"), 0);
  assert.equal(facetNameRank(facet, "name"), 1);
  assert.equal(facetNameRank(facet, "nope"), null);
  const facets = [
    { label: "User id", column: "userId" },
    { label: "Session", column: "sessionId" },
    { label: "Cost", column: "cost" },
  ];
  assert.deepEqual(rankFacetsByName(facets, "id").map((f) => f.column), ["userId", "sessionId"]);
  assert.deepEqual(rankFacetsByName(facets, "s").map((f) => f.column), ["sessionId", "userId", "cost"]);
  assert.deepEqual(rankFacetsByName(facets, "").length, 3);
  assert.deepEqual(rankFacetsByName([], "x"), []);
});

test("index barrel re-exports the facet and search helpers", () => {
  assert.equal(barrel.getFacetSummary, getFacetSummary);
  assert.equal(barrel.getFacetSummaryValue, getFacetSummaryValue);
  assert.equal(barrel.rankFacetOptions, rankFacetOptions);
  assert.equal(barrel.facetNameRank, facetNameRank);
  assert.equal(barrel.rankFacetsByName, rankFacetsByName);
  assert.equal(barrel.filterRank("Alpha", "al"), 0);
  assert.equal(barrel.filterRank("Alpha", "x"), null);
  assert.deepEqual(barrel.rankFilter([{ label: "b-a" }, { label: "ab" }], "a").map((o) => o.label), ["ab", "b-a"]);
  for (const name of ["buildSpanTree", "flattenTree", "transformFiltersForBackend", "aggregateScores", "mergeScoresWithCache"]) {
    assert.equal(typeof (barrel as Record<string, unknown>)[name], "function", name);
  }
});
