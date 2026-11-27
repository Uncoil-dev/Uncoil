import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_REDACTION_RULES, redactForShare, redactPayload, redactRecord, redactString } from "./redaction.ts";

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
  assert.equal(redactString(`key=${"sk_" + "live_"}abcdef12345`, ["api_key"]), "key=[REDACTED_API_KEY]");
  assert.equal(redactString("uncoil_sk_live_AbCd1234efgh", ["api_key"]), "[REDACTED_API_KEY]");
});

test("ssn rule redacts only the dashed format", () => {
  assert.equal(redactString("ssn 123-45-6789.", ["ssn"]), "ssn [REDACTED_SSN].");
  assert.equal(redactString("order 123456789", ["ssn"]), "order 123456789");
});

test("card numbers and SSNs keep their own labels whatever the rule order", () => {
  const input = "card 4242 4242 4242 4242 ssn 123-45-6789 phone +1 415 555 0100";
  const expected = "card [REDACTED_CARD] ssn [REDACTED_SSN] phone [REDACTED_PHONE]";
  assert.equal(redactString(input), expected);
  assert.equal(redactString(input, ["phone", "credit_card", "ssn"]), expected);
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

test("redactForShare masks provider and platform keys", () => {
  const fake = (prefix: string, body: string) => prefix + body;
  const cases: [string, string][] = [
    [fake("sk-", "proj1234567890abcdefgh"), "[REDACTED_API_KEY]"],
    [fake("sk-ant-", "api03-abcdefghij1234567890"), "[REDACTED_API_KEY]"],
    [fake("uncoil_sk_", "test_abcdefgh12345678"), "[REDACTED_API_KEY]"],
    [fake("ghp_", "abcdefghijklmnopqrstuvwxyz0123456789"), "[REDACTED_API_KEY]"],
    [fake("github_pat_", "11ABCDEFG0abcdefghijkl_mnopqrstuvwxyz"), "[REDACTED_API_KEY]"],
    [fake("AKIA", "IOSFODNN7EXAMPLE"), "[REDACTED_API_KEY]"],
    [fake("xoxb-", "123456789012-abcdefghijkl"), "[REDACTED_API_KEY]"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(redactForShare(`use ${input} here`), `use ${expected} here`);
  }
});

test("redactForShare masks bearer tokens and JWTs", () => {
  assert.equal(redactForShare("Authorization: Bearer abc.def-123_xyz=="), "Authorization: Bearer [REDACTED_TOKEN]");
  const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTYifQ", "c2lnbmF0dXJlMTIz"].join(".");
  assert.equal(redactForShare(`t=${jwt}`), "t=[REDACTED_JWT]");
});

test("redactForShare masks PEM private key blocks", () => {
  const mark = (side: string) => `-----${side} RSA ${"PRIVATE"} KEY-----`;
  const pem = `${mark("BEGIN")}\nMIIBOgIBAAJB\nabc\n${mark("END")}`;
  assert.equal(redactForShare(`key:\n${pem}\nend`), "key:\n[REDACTED_PRIVATE_KEY]\nend");
});

test("redactForShare masks secret values in URL query strings", () => {
  assert.equal(
    redactForShare("https://x.test/cb?id=7&token=abc123&sig=zz9&page=2"),
    "https://x.test/cb?id=7&token=[REDACTED_SECRET]&sig=[REDACTED_SECRET]&page=2",
  );
});

test("redactForShare masks values of sensitive object keys, including nested and JSON strings", () => {
  assert.deepEqual(redactForShare({ user: "ann", Password: "hunter2", nested: [{ api_key: "x" }], cookie: "a=b" }), {
    user: "ann",
    Password: "[REDACTED_SECRET]",
    nested: [{ api_key: "[REDACTED_SECRET]" }],
    cookie: "[REDACTED_SECRET]",
  });
  assert.equal(redactForShare('{"authorization":"Basic zzz","n":1}'), '{"authorization":"[REDACTED_SECRET]","n":1}');
});

test("redactForShare masks emails, phones, cards and IPv4 addresses", () => {
  assert.equal(redactForShare("a@b.io"), "[REDACTED_EMAIL]");
  assert.equal(redactForShare("call +1 (555) 123-4567"), "call [REDACTED_PHONE]");
  assert.equal(redactForShare("4111 1111 1111 1111"), "[REDACTED_CARD]");
  assert.equal(redactForShare("from 192.168.1.10 to 10.0.0.1"), "from [REDACTED_IP] to [REDACTED_IP]");
});

test("redactForShare leaves harmless text alone and survives odd input", () => {
  assert.equal(redactForShare("The agent called search twice in 42 ms."), "The agent called search twice in 42 ms.");
  assert.equal(redactForShare(null), null);
  assert.equal(redactForShare(7), 7);
  const deep: Record<string, unknown> = {};
  let cursor = deep;
  for (let i = 0; i < 50; i++) cursor = (cursor.next = {}) as Record<string, unknown>;
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.doesNotThrow(() => redactForShare(deep));
  assert.doesNotThrow(() => redactForShare(circular));
});
