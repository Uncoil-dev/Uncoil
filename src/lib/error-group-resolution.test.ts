import { expect, test } from "vitest";
import { applyResolutions } from "./error-group-resolution";

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
