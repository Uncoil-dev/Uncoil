// Adapted from open-source observability patterns (MIT License)
// Source: web/src/features/traces/fns/treeBuilding.ts
// See /THIRD_PARTY_NOTICES.md
//
// Tree building utilities for the run/span detail view.
//
// IMPLEMENTATION APPROACH:
// Uses fully iterative algorithms (no recursion) to avoid stack overflow on deep trees (10k+ depth).
//
// Algorithm Overview:
// 1. Sort spans by startTime (parsed from createdAt)
// 2. Build dependency graph: Map-based parent-child relationships (O(N))
// 3. Topological sort: Process nodes bottom-up (leaves first) using queue with index-based traversal
// 4. Cost aggregation: Compute bottom-up during tree construction (children before parents)
// 5. Flatten to searchItems: Iterative pre-order traversal using explicit stack
//
// Complexity: O(N) time, O(N) space - handles unlimited depth without stack overflow.
//
// Field names below are Uncoil's own (convex/schema.ts `runSpanCache.spans[]`:
// spanId, parentSpanId, costUsd, latencyMs, modelId, toolName), not an external vendor implementation
// Prisma/Clickhouse-typed ObservationReturnType — the tree/cost aggregation
// algorithm was adapted to that shape.

export type RunSpan = {
  spanId: string;
  parentSpanId: string; // "" (falsy) means root
  spanType: string;
  name?: string;
  createdAt: string; // ISO timestamp
  latencyMs: number;
  costUsd: number;
  modelId?: string;
  toolName?: string;
};

export interface SpanTreeNode {
  id: string; // spanId
  type: string;
  name: string;
  startTime: Date;
  endTime: Date | null;
  children: SpanTreeNode[];
  parentSpanId: string;
  totalCost: number | undefined; // own cost + all descendants' cost
  subtreeWallClockDurationMs: number;
  startTimeSinceRootMs: number;
  startTimeSinceParentStartMs: number | null;
  depth: number;
  childrenDepth: number;
}

export interface SpanSearchListItem {
  node: SpanTreeNode;
  rootTotalCost: number | undefined;
  rootDurationMs: number | undefined;
}

interface ProcessingNode {
  span: RunSpan;
  startMs: number;
  endMs: number;
  childrenIds: string[];
  inDegree: number;
  depth: number;
  treeNode?: SpanTreeNode;
}

/**
 * Collapse spans sharing the same spanId to a single row, keeping the
 * earliest by start time (deterministic). Mirrors the trace tree builder's
 * defense against duplicate/reused ids turning the parent→child graph into a
 * multi-parent DAG, which would otherwise make the depth-propagation BFS
 * below grow without bound.
 */
export function dedupeSpansById(list: RunSpan[]): RunSpan[] {
  const byId = new Map<string, RunSpan>();
  for (const s of list) {
    const existing = byId.get(s.spanId);
    if (!existing || Date.parse(s.createdAt) < Date.parse(existing.createdAt)) {
      byId.set(s.spanId, s);
    }
  }
  return byId.size === list.length ? list : Array.from(byId.values());
}

function prepareSpans(list: RunSpan[]): RunSpan[] {
  if (list.length === 0) return [];

  const deduped = dedupeSpansById(list);
  const spanIds = new Set(deduped.map((s) => s.spanId));

  // Drop parentSpanId references to spans not present in this list
  // (orphaned parent — e.g. a span outside the cached window).
  const cleaned = deduped.map((s) =>
    s.parentSpanId && !spanIds.has(s.parentSpanId)
      ? { ...s, parentSpanId: "" }
      : s,
  );

  return cleaned.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function buildDependencyGraph(sorted: RunSpan[]): {
  registry: Map<string, ProcessingNode>;
  leafIds: string[];
} {
  const registry = new Map<string, ProcessingNode>();

  for (const s of sorted) {
    const startMs = Date.parse(s.createdAt);
    registry.set(s.spanId, {
      span: s,
      startMs,
      endMs: startMs + Math.max(0, s.latencyMs),
      childrenIds: [],
      inDegree: 0,
      depth: 0,
    });
  }

  for (const s of sorted) {
    if (s.parentSpanId) {
      registry.get(s.parentSpanId)?.childrenIds.push(s.spanId);
    }
  }

  // BFS to propagate depth down the tree. Visited-guard means even a
  // pathological multi-parent graph can never enqueue a node twice.
  const rootIds: string[] = [];
  for (const [id, node] of registry) {
    if (!node.span.parentSpanId) {
      rootIds.push(id);
      node.depth = 0;
    }
  }
  const queue = [...rootIds];
  const visited = new Set(rootIds);
  let qi = 0;
  while (qi < queue.length) {
    const currentId = queue[qi++]!;
    const current = registry.get(currentId)!;
    for (const childId of current.childrenIds) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      const child = registry.get(childId)!;
      child.depth = current.depth + 1;
      queue.push(childId);
    }
  }

  const leafIds: string[] = [];
  for (const [id, node] of registry) {
    node.inDegree = node.childrenIds.length;
    if (node.childrenIds.length === 0) leafIds.push(id);
  }

  return { registry, leafIds };
}

function buildTreeNodesBottomUp(
  registry: Map<string, ProcessingNode>,
  leafIds: string[],
  nodeMap: Map<string, SpanTreeNode>,
  rootStartMs: number,
): string[] {
  const queue = [...leafIds];
  let qi = 0;
  const rootIds: string[] = [];

  while (qi < queue.length) {
    const currentId = queue[qi++]!;
    const current = registry.get(currentId)!;
    const span = current.span;

    const childTreeNodes: SpanTreeNode[] = [];
    for (const childId of current.childrenIds) {
      const child = registry.get(childId)!;
      if (child.treeNode) childTreeNodes.push(child.treeNode);
    }

    const ownCost = span.costUsd || undefined;
    const childrenCost = childTreeNodes.reduce<number | undefined>(
      (acc, c) => (c.totalCost == null ? acc : (acc ?? 0) + c.totalCost),
      undefined,
    );
    const totalCost =
      ownCost != null && childrenCost != null
        ? ownCost + childrenCost
        : (ownCost ?? childrenCost);

    let subtreeMin = current.startMs;
    let subtreeMax = current.endMs;
    for (const childId of current.childrenIds) {
      const child = registry.get(childId);
      if (child) {
        subtreeMin = Math.min(subtreeMin, child.startMs);
        subtreeMax = Math.max(subtreeMax, child.endMs);
      }
    }

    const startTimeSinceRootMs = current.startMs - rootStartMs;
    let startTimeSinceParentStartMs: number | null = null;
    if (span.parentSpanId) {
      const parent = registry.get(span.parentSpanId);
      if (parent) startTimeSinceParentStartMs = current.startMs - parent.startMs;
    }

    const childrenDepth =
      childTreeNodes.length > 0
        ? Math.max(...childTreeNodes.map((c) => c.childrenDepth)) + 1
        : 0;

    const treeNode: SpanTreeNode = {
      id: span.spanId,
      type: span.spanType,
      name: span.name ?? span.toolName ?? span.modelId ?? "",
      startTime: new Date(current.startMs),
      endTime: span.latencyMs > 0 ? new Date(current.endMs) : null,
      children: childTreeNodes,
      parentSpanId: span.parentSpanId,
      totalCost,
      subtreeWallClockDurationMs: subtreeMax - subtreeMin,
      startTimeSinceRootMs,
      startTimeSinceParentStartMs,
      depth: current.depth,
      childrenDepth,
    };

    current.treeNode = treeNode;
    nodeMap.set(currentId, treeNode);

    if (span.parentSpanId) {
      const parent = registry.get(span.parentSpanId);
      if (parent) {
        parent.inDegree--;
        if (parent.inDegree === 0) queue.push(span.parentSpanId);
      }
    } else {
      rootIds.push(currentId);
    }
  }

  return rootIds;
}

/**
 * Builds the span tree (roots + O(1) node lookup) from a run's cached spans.
 * Unlike a reference trace tree, there is no synthetic wrapper root here —
 * Uncoil's runSpanCache spans are already rooted (top-level spans have no
 * parentSpanId), so roots are returned directly.
 */
export function buildSpanTree(spans: RunSpan[]): {
  roots: SpanTreeNode[];
  nodeMap: Map<string, SpanTreeNode>;
} {
  const sorted = prepareSpans(spans);
  if (sorted.length === 0) return { roots: [], nodeMap: new Map() };

  const { registry, leafIds } = buildDependencyGraph(sorted);
  const nodeMap = new Map<string, SpanTreeNode>();
  const rootStartMs = Date.parse(sorted[0]!.createdAt);
  const rootIds = buildTreeNodesBottomUp(registry, leafIds, nodeMap, rootStartMs);

  const roots = rootIds
    .map((id) => registry.get(id)!.treeNode!)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return { roots, nodeMap };
}

/**
 * Flattens the tree to a search/virtualization list (iterative DFS to avoid
 * stack overflow on deep trees), carrying root-level totals for heatmap
 * scaling in the UI.
 */
export function buildSpanSearchItems(roots: SpanTreeNode[]): SpanSearchListItem[] {
  if (roots.length === 0) return [];

  const rootTotalCost = roots.reduce<number | undefined>(
    (acc, r) => (r.totalCost == null ? acc : (acc ?? 0) + r.totalCost),
    undefined,
  );
  const rootDurationMs = roots.length
    ? Math.max(
        ...roots.map((r) =>
          r.endTime ? r.endTime.getTime() - r.startTime.getTime() : 0,
        ),
      )
    : undefined;

  const items: SpanSearchListItem[] = [];
  const stack: SpanTreeNode[] = [];
  for (let i = roots.length - 1; i >= 0; i--) stack.push(roots[i]!);

  while (stack.length > 0) {
    const node = stack.pop()!;
    items.push({ node, rootTotalCost, rootDurationMs });
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!);
  }

  return items;
}

/**
 * Removes nodes matching a predicate from a tree, promoting their children
 * to the parent level (e.g. hiding stream-chunk spans without breaking the
 * tree structure). Iterative to avoid call-stack overflow on deep trees.
 */
export function removeHiddenSpanNodes(
  nodes: SpanTreeNode[],
  isHidden: (node: SpanTreeNode) => boolean,
): SpanTreeNode[] {
  if (nodes.length === 0) return [];

  const result: SpanTreeNode[] = [];
  const stack: Array<{ node: SpanTreeNode; target: SpanTreeNode[] }> = [];
  for (let i = nodes.length - 1; i >= 0; i--) stack.push({ node: nodes[i]!, target: result });

  while (stack.length > 0) {
    const { node, target } = stack.pop()!;

    if (isHidden(node)) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i]!, target });
      }
      continue;
    }

    const clone: SpanTreeNode = { ...node, children: [] };
    target.push(clone);
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i]!, target: clone.children });
    }
  }

  return result;
}
