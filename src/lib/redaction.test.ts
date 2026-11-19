import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_REDACTION_RULES, redactPayload, redactRecord, redactString } from "./redaction.ts";

test("default rules cover every supported rule", () => {
  assert.deepEqual([...DEFAULT_REDACTION_RULES], ["email", "phone", "credit_card", "api_key", "ssn"]);
});

test("email rule redacts addresses case-insensitively", () => {
  assert.equal(
    redactString("Contact Jane.Doe+x@Example.co.uk now", ["email"]),
    "Contact [REDACTED_EMAIL] now",
  );
});

test("phone rule redacts formatted numbers", () => {
  assert.equal(redactString("call +1 (555) 123-4567 today", ["phone"]), "call [REDACTED_PHONE] today");
});

test("credit_card rule redacts spaced and dashed card numbers", () => {
  assert.match(redactString("card 4111 1111 1111 1111 ok", ["credit_card"]), /\[REDACTED_CARD\]/);
  assert.equal(redactString("4111-1111-1111-1111", ["credit_card"]), "[REDACTED_CARD]");
});

test("api_key rule redacts known key prefixes", () => {
  assert.equal(redactString("key=sk_live_abcdef12345", ["api_key"]), "key=[REDACTED_API_KEY]");
  assert.equal(redactString("uncoil_sk_live_AbCd1234efgh", ["api_key"]), "[REDACTED_API_KEY]");
});

test("ssn rule redacts only the dashed format", () => {
  assert.equal(redactString("ssn 123-45-6789.", ["ssn"]), "ssn [REDACTED_SSN].");
  assert.equal(redactString("order 123456789", ["ssn"]), "order 123456789");
});

test("only the selected rules are applied", () => {
  assert.equal(redactString("a@b.com 123-45-6789", ["ssn"]), "a@b.com [REDACTED_SSN]");
});

test("missing, empty, or unknown rule lists fall back to all default rules", () => {
  const input = "a@b.com 123-45-6789";
  const expected = redactString(input, [...DEFAULT_REDACTION_RULES]);
  assert.ok(!expected.includes("a@b.com"));
  assert.ok(!expected.includes("123-45-6789"));
  assert.equal(redactString(input), expected);
  assert.equal(redactString(input, []), expected);
  assert.equal(redactString(input, ["nope"]), expected);
});

test("text without sensitive data is unchanged", () => {
  assert.equal(redactString("hello world", ["email", "ssn", "api_key"]), "hello world");
});

test("redactRecord redacts nested strings, arrays, and objects without mutating input", () => {
  const input = {
    email: "a@b.com",
    count: 3,
    flag: null,
    list: ["a@b.com", 5, { inner: "c@d.org" }],
    nested: { deep: { value: "e@f.net" } },
  };
  const snapshot = structuredClone(input);
  assert.deepEqual(redactRecord(input, ["email"]), {
    email: "[REDACTED_EMAIL]",
    count: 3,
    flag: null,
    list: ["[REDACTED_EMAIL]", 5, { inner: "[REDACTED_EMAIL]" }],
    nested: { deep: { value: "[REDACTED_EMAIL]" } },
  });
  assert.deepEqual(input, snapshot);
});

test("redactRecord stops recursing past depth 8", () => {
  let deep: Record<string, unknown> = { value: "a@b.com" };
  for (let i = 0; i < 10; i += 1) deep = { child: deep };
  let cursor = redactRecord(deep, ["email"]) as Record<string, unknown>;
  while (cursor.child) cursor = cursor.child as Record<string, unknown>;
  assert.equal(cursor.value, "a@b.com");
});

test("redactPayload handles strings, objects, and nullish values", () => {
  assert.equal(redactPayload("a@b.com", ["email"]), "[REDACTED_EMAIL]");
  assert.equal(redactPayload({ to: "a@b.com" }, ["email"]), '{"to":"[REDACTED_EMAIL]"}');
  assert.equal(redactPayload(undefined, ["email"]), '""');
  assert.equal(redactPayload(null, ["email"]), '""');
});
