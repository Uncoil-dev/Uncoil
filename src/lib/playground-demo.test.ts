import assert from "node:assert/strict";
import test from "node:test";
import { PLAYGROUND_DEMO_USER_ID } from "./playground-demo.ts";

test("demo user id is a non-empty string", () => {
  assert.equal(typeof PLAYGROUND_DEMO_USER_ID, "string");
  assert.ok(PLAYGROUND_DEMO_USER_ID.length > 0);
});

test("demo user id uses the usr_demo_ prefix with a hex suffix", () => {
  assert.match(PLAYGROUND_DEMO_USER_ID, /^usr_demo_[0-9a-f]{8}$/);
});

test("demo user id is stable and has no whitespace", () => {
  assert.equal(PLAYGROUND_DEMO_USER_ID, "usr_demo_7f3a9c21");
  assert.equal(PLAYGROUND_DEMO_USER_ID, PLAYGROUND_DEMO_USER_ID.trim());
  assert.doesNotMatch(PLAYGROUND_DEMO_USER_ID, /\s/);
});
