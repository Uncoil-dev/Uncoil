import { expect, test } from "vitest";
import { applyResolutions, unresolvedGroupCondition } from "./error-group-resolution";

const group = (id: string, lastSeen: string) => ({ id, lastSeen });
const resolvedAt = Date.parse("2026-05-01T12:00:00Z");

test("a group last seen before the resolve time stays resolved and is hidden by default", () => {
  const groups = [group("a", "2026-05-01 11:59:59"), group("b", "2026-05-02 08:00:00")];
  const shown = applyResolutions(groups, { a: resolvedAt }, false);
  expect(shown.map((g) => g.id)).toEqual(["b"]);
  const all = applyResolutions(groups, { a: resolvedAt }, true);
  expect(all.find((g) => g.id === "a")).toMatchObject({ resolved: true, cameBack: false });
});

test("an error seen after the resolve time reopens the group and marks it as came back", () => {
  const [reopened] = applyResolutions([group("a", "2026-05-01T12:00:01Z")], { a: resolvedAt }, false);
  expect(reopened).toMatchObject({ id: "a", resolved: false, cameBack: true });
});

test("groups with no resolve record are untouched", () => {
  const [plain] = applyResolutions([group("c", "2026-05-02 08:00:00")], {}, false);
  expect(plain).toMatchObject({ id: "c", resolved: false, cameBack: false });
});

test("resolved ids and times are bound into the exclusion condition so a full page of 20 survives", () => {
  const many = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i.toString(16).padStart(4, "0"), resolvedAt + i]));
  const condition = unresolvedGroupCondition(many, "id", "max(createdAt)");
  expect(condition).toContain("transform(id, ['0000',");
  expect(condition?.match(/'[0-9a-f]{4}'/g)).toHaveLength(25);
  expect(condition).toContain(`[${resolvedAt},${resolvedAt + 1},`);
});

test("non-hex ids and invalid times are never put into the SQL", () => {
  const condition = unresolvedGroupCondition({ "a'); DROP": resolvedAt, bad: Number.NaN, "0a1": resolvedAt }, "id", "max(createdAt)");
  expect(condition).not.toMatch(/DROP|bad|NaN/);
  expect(condition).toContain("'0a1'");
  expect(unresolvedGroupCondition({ "x y": 1 }, "id", "max(createdAt)")).toBeNull();
  expect(unresolvedGroupCondition({}, "id", "max(createdAt)")).toBeNull();
});
