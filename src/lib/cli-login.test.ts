import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import type { NextRequest } from "next/server";

// Resolve hook for "@/" and extensionless relative imports.
const srcUrl = pathToFileURL(process.cwd() + "/src/").href;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context);
    }
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const { hashDeviceCode, newDeviceCode, isDeviceCode, requestIp, requestOrigin } = await import("./cli-login.ts");

function fakeRequest(headers: Record<string, string>, nextUrl = { host: "app.example.com", protocol: "https:" }) {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null }, nextUrl } as unknown as NextRequest;
}

test("newDeviceCode returns a unique code that passes isDeviceCode", () => {
  const a = newDeviceCode();
  const b = newDeviceCode();
  assert.notEqual(a, b);
  assert.ok(isDeviceCode(a));
  assert.equal(a.length, 43);
});

test("isDeviceCode rejects non-strings, empty, wrong length and bad characters", () => {
  const valid = "a".repeat(43);
  assert.ok(isDeviceCode(valid));
  assert.ok(isDeviceCode("A-_".repeat(14) + "A"));
  assert.equal(isDeviceCode(undefined), false);
  assert.equal(isDeviceCode(null), false);
  assert.equal(isDeviceCode(42), false);
  assert.equal(isDeviceCode(""), false);
  assert.equal(isDeviceCode("a".repeat(42)), false);
  assert.equal(isDeviceCode("a".repeat(44)), false);
  assert.equal(isDeviceCode("a".repeat(42) + "+"), false);
  assert.equal(isDeviceCode("a".repeat(42) + "\n"), false);
});

test("hashDeviceCode is deterministic hex sha256 and differs from the input", () => {
  const code = "b".repeat(43);
  const hash = hashDeviceCode(code);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashDeviceCode(code));
  assert.notEqual(hash, hashDeviceCode("c".repeat(43)));
  assert.notEqual(hash, code);
  assert.equal(hashDeviceCode(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("requestIp takes the first forwarded address, trimmed", () => {
  assert.equal(requestIp(fakeRequest({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" })), "203.0.113.7");
});

test("requestIp falls back to unknown for missing or empty header", () => {
  assert.equal(requestIp(fakeRequest({})), "unknown");
  assert.equal(requestIp(fakeRequest({ "x-forwarded-for": "" })), "unknown");
  assert.equal(requestIp(fakeRequest({ "x-forwarded-for": " , 10.0.0.1" })), "unknown");
});

test("requestOrigin prefers the forwarded host and forces https for public hosts", () => {
  const req = fakeRequest({ "x-forwarded-host": "www.example.com, proxy.internal", host: "other.example.com" }, { host: "x", protocol: "http:" });
  assert.equal(requestOrigin(req), "https://www.example.com");
});

test("requestOrigin falls back to the host header, then nextUrl host", () => {
  assert.equal(requestOrigin(fakeRequest({ host: " cli.example.com " })), "https://cli.example.com");
  assert.equal(requestOrigin(fakeRequest({})), "https://app.example.com");
});

test("requestOrigin keeps the request protocol for local hosts only", () => {
  const http = { host: "x", protocol: "http:" };
  assert.equal(requestOrigin(fakeRequest({ host: "localhost:3000" }, http)), "http://localhost:3000");
  assert.equal(requestOrigin(fakeRequest({ host: "127.0.0.1:3000" }, http)), "http://127.0.0.1:3000");
  assert.equal(requestOrigin(fakeRequest({ host: "[::1]:3000" }, http)), "http://[::1]:3000");
  assert.equal(requestOrigin(fakeRequest({ host: "localhost" }, http)), "http://localhost");
  assert.equal(requestOrigin(fakeRequest({ host: "localhost.evil.example" }, http)), "https://localhost.evil.example");
});
