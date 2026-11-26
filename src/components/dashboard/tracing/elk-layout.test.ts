// @vitest-environment node
import { describe, expect, it } from "vitest";

import { layoutWithElk } from "./elk-layout";

const nodes = ["a", "b", "c"].map((id) => ({ id, width: 120, height: 40 }));
const edges = [
  { id: "a-b", source: "a", target: "b" },
  { id: "b-c", source: "b", target: "c" },
];

describe("layoutWithElk", () => {
  it("places a chain left to right with finite positions", async () => {
    const positions = await layoutWithElk("chain", nodes, edges, new Map());

    expect([...positions.keys()].sort()).toEqual(["a", "b", "c"]);
    for (const { x, y } of positions.values()) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
    const [a, b, c] = ["a", "b", "c"].map((id) => positions.get(id)!);
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it("places a chain top to bottom when the direction is DOWN", async () => {
    const positions = await layoutWithElk("chain-down", nodes, edges, new Map(), "DOWN");

    const [a, b, c] = ["a", "b", "c"].map((id) => positions.get(id)!);
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  it("keeps a node at its previous position", async () => {
    const positions = await layoutWithElk("kept", nodes, edges, new Map([["b", { x: 900, y: 700 }]]));

    expect(positions.get("b")).toEqual({ x: 900, y: 700 });
  });

  it("returns an empty map for an empty graph", async () => {
    await expect(layoutWithElk("empty", [], [], new Map())).resolves.toEqual(new Map());
  });
});
