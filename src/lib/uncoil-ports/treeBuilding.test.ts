import { describe, expect, it } from "vitest";

import {
  buildSpanSearchItems,
  buildSpanTree,
  dedupeSpansById,
  removeHiddenSpanNodes,
  type RunSpan,
  type SpanTreeNode,
} from "./treeBuilding";

const T0 = Date.parse("2026-01-01T00:00:00.000Z");

function span(
  spanId: string,
  parentSpanId: string,
  offsetMs: number,
  extra: Partial<RunSpan> = {},
): RunSpan {
  return {
    spanId,
    parentSpanId,
    spanType: "tool",
    name: spanId,
    createdAt: new Date(T0 + offsetMs).toISOString(),
    latencyMs: 100,
    costUsd: 0,
    ...extra,
  };
}

const ids = (nodes: SpanTreeNode[]) => nodes.map((n) => n.id);

describe("dedupeSpansById", () => {
  it("keeps one span per id, choosing the earliest", () => {
    const late = span("a", "", 50, { name: "late" });
    const early = span("a", "", 10, { name: "early" });
    const out = dedupeSpansById([late, span("b", "", 20), early]);
    expect(out).toHaveLength(2);
    expect(out.find((s) => s.spanId === "a")?.name).toBe("early");
  });

  it("returns the input untouched when ids are unique", () => {
    const list = [span("a", "", 0), span("b", "", 1)];
    expect(dedupeSpansById(list)).toBe(list);
  });
});

describe("buildSpanTree", () => {
  it("nests children under parents with depth and cost rolled up", () => {
    const { roots, nodeMap } = buildSpanTree([
      span("grandchild", "child", 30, { costUsd: 0.25 }),
      span("root", "", 0, { costUsd: 1 }),
      span("child", "root", 10, { costUsd: 0.5 }),
      span("sibling", "root", 20),
    ]);

    expect(ids(roots)).toEqual(["root"]);
    expect(ids(roots[0]!.children)).toEqual(["child", "sibling"]);
    expect(ids(nodeMap.get("child")!.children)).toEqual(["grandchild"]);
    expect(nodeMap.get("grandchild")!.depth).toBe(2);
    expect(roots[0]!.totalCost).toBe(1.75);
    expect(roots[0]!.childrenDepth).toBe(2);
    expect(nodeMap.get("child")!.startTimeSinceParentStartMs).toBe(10);
  });

  it("treats spans whose parent is missing as roots", () => {
    const { roots } = buildSpanTree([
      span("root", "", 0),
      span("orphan", "not-in-list", 5),
    ]);
    expect(ids(roots)).toEqual(["root", "orphan"]);
    expect(roots[1]!.parentSpanId).toBe("");
    expect(roots[1]!.depth).toBe(0);
  });

  it("returns an empty tree for no spans", () => {
    const { roots, nodeMap } = buildSpanTree([]);
    expect(roots).toEqual([]);
    expect(nodeMap.size).toBe(0);
  });
});

describe("buildSpanSearchItems", () => {
  it("lists every node in pre-order with its depth and root totals", () => {
    const { roots } = buildSpanTree([
      span("r1", "", 0, { costUsd: 2, latencyMs: 400 }),
      span("c1", "r1", 10, { costUsd: 1 }),
      span("g1", "c1", 20),
      span("r2", "", 30, { latencyMs: 50 }),
    ]);
    const items = buildSpanSearchItems(roots);

    expect(items.map((i) => [i.node.id, i.node.depth])).toEqual([
      ["r1", 0],
      ["c1", 1],
      ["g1", 2],
      ["r2", 0],
    ]);
    expect(items[0]!.rootTotalCost).toBe(3);
    expect(items[0]!.rootDurationMs).toBe(400);
  });

  it("returns nothing for an empty tree", () => {
    expect(buildSpanSearchItems([])).toEqual([]);
  });
});

describe("removeHiddenSpanNodes", () => {
  it("lifts the children of hidden nodes to the hidden node's parent", () => {
    const { roots } = buildSpanTree([
      span("root", "", 0),
      span("hidden", "root", 10, { spanType: "chunk" }),
      span("kept-a", "hidden", 20),
      span("kept-b", "hidden", 30),
      span("after", "root", 40),
    ]);
    const out = removeHiddenSpanNodes(roots, (n) => n.type === "chunk");

    expect(ids(out)).toEqual(["root"]);
    expect(ids(out[0]!.children)).toEqual(["kept-a", "kept-b", "after"]);
    // The source tree is left as it was.
    expect(ids(roots[0]!.children)).toEqual(["hidden", "after"]);
  });

  it("promotes children to the top level when a root is hidden", () => {
    const { roots } = buildSpanTree([
      span("root", "", 0, { spanType: "chunk" }),
      span("child", "root", 10),
    ]);
    const out = removeHiddenSpanNodes(roots, (n) => n.type === "chunk");
    expect(ids(out)).toEqual(["child"]);
  });
});
