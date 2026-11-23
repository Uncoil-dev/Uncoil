import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { getPublicOrigin } from "./public-origin.ts";

const saved = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

test("uses x-forwarded-host with https by default", () => {
  const r = req("http://localhost:3000/a", { "x-forwarded-host": "www.example.com" });
  assert.equal(getPublicOrigin(r), "https://www.example.com");
});

test("honors x-forwarded-proto", () => {
  const r = req("http://localhost:3000/a", {
    "x-forwarded-host": "app.example.com",
    "x-forwarded-proto": "http",
  });
  assert.equal(getPublicOrigin(r), "http://app.example.com");
});

test("uses the first value of comma-separated forwarded headers", () => {
  const r = req("http://localhost:3000/a", {
    "x-forwarded-host": " a.example.com , b.example.com",
    "x-forwarded-proto": "https, http",
  });
  assert.equal(getPublicOrigin(r), "https://a.example.com");
});

test("falls back to the host header when no forwarded host", () => {
  const r = req("http://localhost:3000/a", { host: "host.example.com" });
  assert.equal(getPublicOrigin(r), "https://host.example.com");
});

test("returns the request origin when the url host is public", () => {
  assert.equal(getPublicOrigin(req("https://public.example.com/x?y=1")), "https://public.example.com");
});

test("local request falls back to the configured site url", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com///";
  assert.equal(getPublicOrigin(req("http://localhost:3000/a")), "https://site.example.com");
});

test("ignores a local site url", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  assert.equal(getPublicOrigin(req("http://localhost:3000/a")), "http://localhost:3000");
});

test("returns the local origin when no site url is set", () => {
  assert.equal(getPublicOrigin(req("http://127.0.0.1:4000/a")), "http://127.0.0.1:4000");
});

test("treats local forwarded hosts as unusable", () => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com";
  for (const host of ["localhost", "localhost:3000", "127.0.0.1:80", "[::1]:3000"]) {
    const r = req("http://localhost:3000/a", { "x-forwarded-host": host });
    assert.equal(getPublicOrigin(r), "https://site.example.com", host);
  }
});

test("does not treat hosts that merely start with localhost as local", () => {
  const r = req("http://localhost:3000/a", { "x-forwarded-host": "localhost.example.com" });
  assert.equal(getPublicOrigin(r), "https://localhost.example.com");
});
