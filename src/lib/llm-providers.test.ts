import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDER_PRESETS, checkBaseUrl, lastFour, presetFor } from "./llm-providers.ts";

test("presetFor returns the matching preset for every known id", () => {
  for (const preset of PROVIDER_PRESETS) assert.equal(presetFor(preset.id), preset);
  assert.equal(presetFor("openai")?.baseUrl, "https://api.openai.com/v1");
});

test("presetFor returns undefined for unknown or differently cased ids", () => {
  assert.equal(presetFor("nope"), undefined);
  assert.equal(presetFor(""), undefined);
  assert.equal(presetFor("OpenAI"), undefined);
});

test("every preset with a base URL passes checkBaseUrl unchanged", () => {
  for (const preset of PROVIDER_PRESETS.filter((p) => p.baseUrl)) {
    assert.deepEqual(checkBaseUrl(preset.baseUrl), { ok: true, url: preset.baseUrl });
  }
});

test("checkBaseUrl trims whitespace and strips trailing slashes, query and hash", () => {
  assert.deepEqual(checkBaseUrl("  https://api.example.com/v1/  "), { ok: true, url: "https://api.example.com/v1" });
  assert.deepEqual(checkBaseUrl("https://api.example.com/v1///"), { ok: true, url: "https://api.example.com/v1" });
  assert.deepEqual(checkBaseUrl("https://api.example.com/v1?x=1#frag"), { ok: true, url: "https://api.example.com/v1" });
  assert.deepEqual(checkBaseUrl("https://api.example.com"), { ok: true, url: "https://api.example.com" });
});

test("checkBaseUrl accepts the explicit default HTTPS port", () => {
  assert.deepEqual(checkBaseUrl("https://api.example.com:443/v1"), { ok: true, url: "https://api.example.com/v1" });
});

test("checkBaseUrl rejects malformed input", () => {
  for (const value of ["", "   ", "not a url", "api.example.com/v1"]) {
    const result = checkBaseUrl(value);
    assert.equal(result.ok, false, value);
    if (!result.ok) assert.match(result.reason, /full address/);
  }
});

test("checkBaseUrl rejects non-HTTPS schemes", () => {
  for (const value of ["http://api.example.com", "ftp://api.example.com", "file:///etc/passwd"]) {
    const result = checkBaseUrl(value);
    assert.equal(result.ok, false, value);
    if (!result.ok) assert.match(result.reason, /https/);
  }
});

test("checkBaseUrl rejects embedded credentials and non-standard ports", () => {
  const creds = checkBaseUrl("https://user:secret@api.example.com");
  assert.equal(creds.ok, false);
  if (!creds.ok) assert.match(creds.reason, /key out/);
  const port = checkBaseUrl("https://api.example.com:8443");
  assert.equal(port.ok, false);
  if (!port.ok) assert.match(port.reason, /port/);
});

test("checkBaseUrl rejects local and single-label hosts", () => {
  for (const value of ["https://localhost", "https://app.localhost", "https://printer.local", "https://db.internal", "https://intranet"]) {
    const result = checkBaseUrl(value);
    assert.equal(result.ok, false, value);
    if (!result.ok) assert.match(result.reason, /not reachable/);
  }
});

test("checkBaseUrl rejects private, loopback, IPv6 and numeric hosts", () => {
  const privateOrIp = ["https://10.0.0.1", "https://127.0.0.1", "https://192.168.1.5", "https://172.16.0.1", "https://169.254.169.254", "https://100.64.0.1", "https://[::1]", "https://8.8.8.8"];
  for (const value of privateOrIp) assert.equal(checkBaseUrl(value).ok, false, value);
});

test("lastFour trims and returns the final four characters", () => {
  assert.equal(lastFour("  sk-abcd1234  "), "1234");
  assert.equal(lastFour("ab"), "ab");
});
