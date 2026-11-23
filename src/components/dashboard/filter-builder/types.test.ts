import assert from "node:assert/strict";
import test from "node:test";

import {
  OPERATORS_BY_TYPE,
  OPERATOR_LABEL,
  defaultOperatorForColumn,
  defaultValueForColumn,
  emptyCondition,
  isConditionActive,
  operatorsForColumn,
  type FilterColumnDef,
  type FilterCondition,
  type FilterOperator,
  type FilterValueType,
} from "./types.ts";

const column = (type: FilterValueType, extra: Partial<FilterColumnDef> = {}): FilterColumnDef => ({
  id: `col-${type}`,
  name: `Column ${type}`,
  type,
  ...extra,
});

const condition = (value: FilterCondition["value"]): FilterCondition => ({
  id: "c1",
  column: "col",
  operator: "=",
  value,
});

const types: FilterValueType[] = ["string", "number", "select"];

test("operatorsForColumn returns the type defaults for every column type", () => {
  for (const type of types) {
    assert.deepEqual(operatorsForColumn(column(type)), OPERATORS_BY_TYPE[type]);
  }
});

test("operatorsForColumn prefers allowedOperators when provided", () => {
  assert.deepEqual(operatorsForColumn(column("string", { allowedOperators: ["="] })), ["="]);
  assert.deepEqual(operatorsForColumn(column("number", { allowedOperators: [">", "<"] })), [">", "<"]);
});

test("operatorsForColumn honors an empty allowedOperators list", () => {
  assert.deepEqual(operatorsForColumn(column("string", { allowedOperators: [] })), []);
});

test("defaultOperatorForColumn picks the first supported operator", () => {
  assert.equal(defaultOperatorForColumn(column("string")), "=");
  assert.equal(defaultOperatorForColumn(column("number")), "=");
  assert.equal(defaultOperatorForColumn(column("select")), "any of");
  assert.equal(defaultOperatorForColumn(column("string", { allowedOperators: ["contains", "="] })), "contains");
});

test("defaultValueForColumn returns an empty array for select and empty string otherwise", () => {
  assert.deepEqual(defaultValueForColumn(column("select")), []);
  assert.equal(defaultValueForColumn(column("string")), "");
  assert.equal(defaultValueForColumn(column("number")), "");
});

test("defaultValueForColumn returns a fresh array on each call", () => {
  const col = column("select");
  assert.notEqual(defaultValueForColumn(col), defaultValueForColumn(col));
});

test("emptyCondition builds an inactive condition from the column", () => {
  for (const type of types) {
    const col = column(type);
    const result = emptyCondition(col);
    assert.equal(result.column, col.id);
    assert.equal(result.operator, defaultOperatorForColumn(col));
    assert.deepEqual(result.value, defaultValueForColumn(col));
    assert.equal(isConditionActive(result), false);
  }
});

test("emptyCondition assigns a unique local id distinct from the column id", () => {
  const col = column("string");
  const a = emptyCondition(col);
  const b = emptyCondition(col);
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.id, col.id);
  assert.ok(a.id.length > 0);
});

test("isConditionActive handles arrays", () => {
  assert.equal(isConditionActive(condition([])), false);
  assert.equal(isConditionActive(condition(["a"])), true);
  assert.equal(isConditionActive(condition([""])), true);
});

test("isConditionActive handles strings and whitespace", () => {
  assert.equal(isConditionActive(condition("")), false);
  assert.equal(isConditionActive(condition("   \t\n")), false);
  assert.equal(isConditionActive(condition("abc")), true);
  assert.equal(isConditionActive(condition("  x  ")), true);
});

test("isConditionActive treats numbers, including zero, as active", () => {
  assert.equal(isConditionActive(condition(0)), true);
  assert.equal(isConditionActive(condition(42)), true);
  assert.equal(isConditionActive(condition(-1.5)), true);
});

test("OPERATOR_LABEL covers every operator used by any column type", () => {
  const used = new Set<FilterOperator>(types.flatMap((type) => OPERATORS_BY_TYPE[type]));
  for (const operator of used) {
    assert.ok(OPERATOR_LABEL[operator].length > 0, `missing label for ${operator}`);
  }
  assert.equal(OPERATOR_LABEL["="], "is");
  assert.equal(OPERATOR_LABEL["!="], "is not");
  assert.equal(OPERATOR_LABEL[">="], "≥");
  assert.equal(OPERATOR_LABEL["<="], "≤");
});

test("OPERATORS_BY_TYPE lists non-empty operator sets without duplicates", () => {
  for (const type of types) {
    const ops = OPERATORS_BY_TYPE[type];
    assert.ok(ops.length > 0);
    assert.equal(new Set(ops).size, ops.length);
  }
});
