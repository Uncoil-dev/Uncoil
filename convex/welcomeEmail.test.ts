import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// welcomeEmail.ts imports the Convex runtime and auth component, which cannot load in plain node.
// Stub both so only the pure exports are exercised.
const hook = `
export async function resolve(specifier, context, next) {
  if (specifier === "./_generated/server" || specifier === "./betterAuth/auth") {
    return { url: "data:text/javascript," + encodeURIComponent(
      "export const mutation = (d) => d; export const authComponent = {};"
    ), shortCircuit: true };
  }
  return next(specifier, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hook)}`);

const { WELCOME_WINDOW_MS, isNewAccount } = (await import("./welcomeEmail.ts")) as {
  WELCOME_WINDOW_MS: number;
  isNewAccount: (createdAt: number, now: number) => boolean;
};

const NOW = Date.parse("2026-01-01T12:00:00.000Z");

test("WELCOME_WINDOW_MS is two hours", () => {
  assert.equal(WELCOME_WINDOW_MS, 2 * 60 * 60 * 1000);
});

test("isNewAccount is true for an account created just now", () => {
  assert.equal(isNewAccount(NOW, NOW), true);
});

test("isNewAccount is true inside the window", () => {
  assert.equal(isNewAccount(NOW - 60 * 60_000, NOW), true);
});

test("isNewAccount is true one millisecond before the window ends", () => {
  assert.equal(isNewAccount(NOW - WELCOME_WINDOW_MS + 1, NOW), true);
});

test("isNewAccount is false exactly at the window boundary", () => {
  assert.equal(isNewAccount(NOW - WELCOME_WINDOW_MS, NOW), false);
});

test("isNewAccount is false after the window", () => {
  assert.equal(isNewAccount(NOW - WELCOME_WINDOW_MS - 1, NOW), false);
  assert.equal(isNewAccount(NOW - 24 * 60 * 60_000, NOW), false);
});

test("isNewAccount is false for accounts created in the future", () => {
  assert.equal(isNewAccount(NOW + 1, NOW), false);
  assert.equal(isNewAccount(NOW + WELCOME_WINDOW_MS, NOW), false);
});
