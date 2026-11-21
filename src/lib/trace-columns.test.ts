import { describe, expect, test } from "vitest";
import {
  COLUMN_DEFS,
  DEFAULT_COLUMNS,
  GROUPS,
  META_PREFIX,
  columnLabel,
  extraIdsFor,
  isKnownColumn,
  isMetaColumn,
  metaColumn,
  metaKeysFor,
  orderColumns,
} from "./trace-columns.ts";

describe("metaColumn / isMetaColumn", () => {
  test("prefixes the key and round-trips through isMetaColumn", () => {
    expect(metaColumn("customer")).toBe("meta:customer");
    expect(isMetaColumn(metaColumn("customer"))).toBe(true);
  });

  test("an empty key is not a valid meta column", () => {
    expect(isMetaColumn(META_PREFIX)).toBe(false);
    expect(isMetaColumn(metaColumn(""))).toBe(false);
  });

  test("keys may contain colons and are kept intact", () => {
    expect(isMetaColumn("meta:a:b")).toBe(true);
    expect(columnLabel("meta:a:b")).toBe("a:b");
  });

  test("ids without the exact prefix are not meta columns", () => {
    expect(isMetaColumn("status")).toBe(false);
    expect(isMetaColumn("Meta:x")).toBe(false);
    expect(isMetaColumn("xmeta:x")).toBe(false);
  });
});

describe("isKnownColumn", () => {
  test("accepts every built-in id", () => {
    for (const column of COLUMN_DEFS) expect(isKnownColumn(column.id)).toBe(true);
  });

  test("accepts non-empty meta columns only", () => {
    expect(isKnownColumn("meta:region")).toBe(true);
    expect(isKnownColumn("meta:")).toBe(false);
  });

  test("rejects unknown ids", () => {
    expect(isKnownColumn("nope")).toBe(false);
    expect(isKnownColumn("")).toBe(false);
    expect(isKnownColumn("STATUS")).toBe(false);
  });
});

describe("columnLabel", () => {
  test("uses the definition label for built-ins", () => {
    expect(columnLabel("startedAt")).toBe("Start time");
    expect(columnLabel("ttftMs")).toBe("Time to first token");
  });

  test("strips the prefix for meta columns", () => {
    expect(columnLabel("meta:customer")).toBe("customer");
  });

  test("falls back to the raw id for unknown ids, including a bare prefix", () => {
    expect(columnLabel("mystery")).toBe("mystery");
    expect(columnLabel("meta:")).toBe("meta:");
    expect(columnLabel("")).toBe("");
  });
});

describe("orderColumns", () => {
  test("sorts built-ins into menu order regardless of input order", () => {
    expect(orderColumns(["cost", "status", "startedAt"])).toEqual(["startedAt", "status", "cost"]);
  });

  test("appends meta columns after built-ins in the order given", () => {
    expect(orderColumns(["meta:b", "cost", "meta:a", "status"])).toEqual(["status", "cost", "meta:b", "meta:a"]);
  });

  test("drops unknown ids and empty meta keys", () => {
    expect(orderColumns(["bogus", "meta:", "status"])).toEqual(["status"]);
  });

  test("returns an empty list for empty input", () => {
    expect(orderColumns([])).toEqual([]);
  });

  test("does not duplicate built-ins listed twice", () => {
    expect(orderColumns(["status", "status"])).toEqual(["status"]);
  });

  test("does not mutate its input", () => {
    const input = ["cost", "status"];
    orderColumns(input);
    expect(input).toEqual(["cost", "status"]);
  });
});

describe("extraIdsFor", () => {
  test("returns only columns flagged extra, in menu order", () => {
    expect(extraIdsFor(["retries", "status", "rootType", "cost"])).toEqual(["rootType", "retries"]);
  });

  test("ignores meta columns and unknown ids", () => {
    expect(extraIdsFor(["meta:x", "nope"])).toEqual([]);
    expect(extraIdsFor([])).toEqual([]);
  });

  test("the default columns need no extra fetches", () => {
    expect(extraIdsFor(DEFAULT_COLUMNS)).toEqual([]);
  });
});

describe("metaKeysFor", () => {
  test("returns the keys of meta columns in the order given", () => {
    expect(metaKeysFor(["status", "meta:b", "cost", "meta:a"])).toEqual(["b", "a"]);
  });

  test("skips empty meta keys and non-meta ids", () => {
    expect(metaKeysFor(["meta:", "meta", "status"])).toEqual([]);
    expect(metaKeysFor([])).toEqual([]);
  });

  test("inverts metaColumn", () => {
    expect(metaKeysFor(["customer", "region"].map(metaColumn))).toEqual(["customer", "region"]);
  });
});

describe("column definitions", () => {
  test("ids are unique and none collide with the meta prefix", () => {
    const ids = COLUMN_DEFS.map((column) => column.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith(META_PREFIX))).toBe(false);
  });

  test("every definition has a label, hint and listed group", () => {
    for (const column of COLUMN_DEFS) {
      expect(column.label.length).toBeGreaterThan(0);
      expect(column.hint.length).toBeGreaterThan(0);
      expect(GROUPS).toContain(column.group);
    }
  });

  test("DEFAULT_COLUMNS are known, unique, non-extra and already in menu order", () => {
    expect(new Set(DEFAULT_COLUMNS).size).toBe(DEFAULT_COLUMNS.length);
    for (const id of DEFAULT_COLUMNS) {
      expect(isKnownColumn(id)).toBe(true);
      expect(COLUMN_DEFS.find((column) => column.id === id)?.extra).toBeFalsy();
    }
    expect(orderColumns(DEFAULT_COLUMNS)).toEqual(DEFAULT_COLUMNS);
  });
});
