import assert from "node:assert/strict";
import test from "node:test";

import { KIND_TEXT } from "./kind-text.ts";
import type { GroupView, ListResponse, Query } from "./group-view.ts";

const kinds = Object.keys(KIND_TEXT) as Array<keyof typeof KIND_TEXT>;

test("KIND_TEXT: exposes session and user with complete copy", () => {
  assert.deepEqual([...kinds].sort(), ["session", "user"]);
  for (const kind of kinds) {
    const t = KIND_TEXT[kind];
    for (const [field, value] of Object.entries(t)) {
      assert.equal(typeof value, "string", `${kind}.${field}`);
      assert.ok(value.length > 0, `${kind}.${field}`);
    }
  }
});

test("KIND_TEXT: titles and counts match each kind", () => {
  assert.equal(KIND_TEXT.session.title, "Sessions");
  assert.equal(KIND_TEXT.session.one, "session");
  assert.equal(KIND_TEXT.session.many, "sessions");
  assert.equal(KIND_TEXT.user.title, "Users");
  assert.equal(KIND_TEXT.user.one, "user");
  assert.equal(KIND_TEXT.user.many, "users");
});

test("KIND_TEXT: each kind points at the other as its sibling", () => {
  assert.equal(KIND_TEXT.session.route, KIND_TEXT.user.otherRoute);
  assert.equal(KIND_TEXT.user.route, KIND_TEXT.session.otherRoute);
  assert.equal(KIND_TEXT.session.otherPlural, KIND_TEXT.user.many);
  assert.equal(KIND_TEXT.user.otherPlural, KIND_TEXT.session.many);
  assert.equal(KIND_TEXT.session.other.toLowerCase(), KIND_TEXT.user.one);
  assert.equal(KIND_TEXT.user.other.toLowerCase(), KIND_TEXT.session.many);
});

test("KIND_TEXT: search placeholders mention both kinds", () => {
  assert.match(KIND_TEXT.session.search, /sessions/i);
  assert.match(KIND_TEXT.session.search, /users/i);
  assert.match(KIND_TEXT.user.search, /users/i);
  assert.match(KIND_TEXT.user.search, /sessions/i);
});

test("KIND_TEXT: unknown and empty kinds are undefined", () => {
  const text = KIND_TEXT as Record<string, unknown>;
  assert.equal(text["trace"], undefined);
  assert.equal(text[""], undefined);
});

test("group-view types: query and list response shapes accept empty values", () => {
  const query: Query = {};
  assert.deepEqual(Object.keys(query), []);
  const empty: Pick<ListResponse, "rows" | "total" | "page" | "pageSize" | "environments"> = {
    rows: [], total: 0, page: 1, pageSize: 25, environments: [],
  };
  assert.equal(empty.rows.length, 0);
  const direction: GroupView["direction"] = "asc";
  assert.ok(["asc", "desc"].includes(direction));
});
