import assert from "node:assert/strict";
import test from "node:test";

import {
  getColumnOptionsForFilterRow,
  normalizeFilterColumnNames,
  transformFiltersForBackend,
} from "./filterTransform.ts";
import { flattenTree } from "./flattenTree.ts";
import { filterRank, rankFilter } from "./searchRank.ts";

type N = { id: string; children: N[]; startTime?: Date };
const n = (id: string, children: N[] = [], t?: number): N => ({
  id,
  children,
  startTime: t === undefined ? undefined : new Date(t),
});

const columns = [
  { id: "modelId", name: "Model", aliases: ["llm"] },
  { id: "status", name: "Status" },
];

test("normalizeFilterColumnNames maps names and aliases to ids", () => {
  const out = normalizeFilterColumnNames(
    [{ column: "Model", v: 1 }, { column: "llm" }, { column: "status" }, { column: "other" }],
    columns,
  );
  assert.deepEqual(out.map((f) => f.column), ["modelId", "modelId", "status", "other"]);
  assert.equal(out[0]!.v, 1);
});

test("filter transforms handle empty filters and maps", () => {
  assert.deepEqual(normalizeFilterColumnNames([], columns), []);
  assert.deepEqual(transformFiltersForBackend([], { a: "b" }), []);
  const input = [{ column: "a" }];
  assert.deepEqual(transformFiltersForBackend(input, {}), input);
  assert.deepEqual(transformFiltersForBackend(input, { a: "b" }), [{ column: "b" }]);
  assert.equal(input[0]!.column, "a");
});

test("getColumnOptionsForFilterRow hides columns unless selected", () => {
  assert.equal(getColumnOptionsForFilterRow(columns, undefined), columns);
  const ids = (c: string | undefined) =>
    getColumnOptionsForFilterRow(columns, c, ["modelId"]).map((x) => x.id);
  assert.deepEqual(ids(undefined), ["status"]);
  assert.deepEqual(ids("modelId"), ["modelId", "status"]);
  assert.deepEqual(ids("Model"), ["modelId", "status"]);
  assert.deepEqual(ids("llm"), ["modelId", "status"]);
});

test("flattenTree returns empty list for no roots", () => {
  assert.deepEqual(flattenTree<N>([], new Set()), []);
});

test("flattenTree walks nested trees depth-first with tree lines", () => {
  const tree = n("r", [n("b", [n("b1")], 2), n("a", [], 1)], 0);
  const flat = flattenTree([tree], new Set());
  assert.deepEqual(flat.map((f) => [f.node.id, f.depth]), [["r", 0], ["a", 1], ["b", 1], ["b1", 2]]);
  assert.deepEqual(flat.map((f) => f.isLastSibling), [true, false, true, true]);
  assert.deepEqual(flat[3]!.treeLines, [false, false]);
  assert.deepEqual(flat[1]!.treeLines, [true]);
});

test("flattenTree sorts multiple roots and skips collapsed children", () => {
  const roots = [n("late", [n("x")], 20), n("early", [n("y")], 10)];
  const flat = flattenTree(roots, new Set(["late"]));
  assert.deepEqual(flat.map((f) => f.node.id), ["early", "y", "late"]);
  assert.equal(flat[0]!.isLastSibling, false);
  assert.equal(flat[2]!.isLastSibling, true);
});

test("filterRank scores prefix, substring and miss", () => {
  assert.equal(filterRank("Model", ""), 0);
  assert.equal(filterRank("Model", "MOD"), 0);
  assert.equal(filterRank("Base model", "mod"), 1);
  assert.equal(filterRank("Model", "zzz"), null);
});

test("rankFilter orders prefix before substring and drops misses", () => {
  const opts = [{ label: "my model" }, { label: "other" }, { label: "Model A" }, { label: "model b" }];
  assert.deepEqual(rankFilter(opts, "model").map((o) => o.label), ["Model A", "model b", "my model"]);
  assert.equal(rankFilter(opts, "").length, 4);
  assert.deepEqual(rankFilter([], "x"), []);
});
