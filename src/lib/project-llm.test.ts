import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach, afterEach } from "node:test";

// project-llm.ts imports path-aliased modules plain Node cannot resolve, so a
// resolve hook swaps them for small stubs driven through globalThis.
const stubs: Record<string, string> = {
  "convex/_generated/api": `export const api = { llmConnections: { getDefaultSecret: "getDefaultSecret" } };`,
  "@/lib/integration-crypto": `
    export const decryptIntegrationSecret = async (cipher, key) => {
      globalThis.__decrypts.push([cipher, key]);
      if (globalThis.__decryptError) throw globalThis.__decryptError;
      return "plain:" + cipher;
    };`,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as { __decrypts: unknown[][]; __decryptError: unknown };
g.__decrypts = [];
const { chatUrl, connectionKey, getProjectLlm } = await import("./project-llm.ts");

type Client = Parameters<typeof getProjectLlm>[0];
const fakeClient = (query: (...args: unknown[]) => Promise<unknown>) => ({ query }) as unknown as Client;
const secret = { ciphertext: "ct", baseUrl: "https://llm.example.test/v1", defaultModel: "m-1", provider: "custom" };

const originalKey = process.env.UNCOIL_CONNECTION_KEY;
const originalWarn = console.warn;
let warnings: unknown[][];

beforeEach(() => {
  g.__decrypts = [];
  g.__decryptError = undefined;
  warnings = [];
  console.warn = (...args: unknown[]) => void warnings.push(args);
  process.env.UNCOIL_CONNECTION_KEY = ["k", "e", "y"].join("");
});

afterEach(() => {
  console.warn = originalWarn;
  if (originalKey === undefined) delete process.env.UNCOIL_CONNECTION_KEY;
  else process.env.UNCOIL_CONNECTION_KEY = originalKey;
});

test("connectionKey trims whitespace and defaults to empty", () => {
  process.env.UNCOIL_CONNECTION_KEY = "  abc  ";
  assert.equal(connectionKey(), "abc");
  process.env.UNCOIL_CONNECTION_KEY = "   ";
  assert.equal(connectionKey(), "");
  delete process.env.UNCOIL_CONNECTION_KEY;
  assert.equal(connectionKey(), "");
});

test("chatUrl strips trailing slashes before appending the path", () => {
  assert.equal(chatUrl("https://a.test/v1"), "https://a.test/v1/chat/completions");
  assert.equal(chatUrl("https://a.test/v1///"), "https://a.test/v1/chat/completions");
});

test("getProjectLlm returns null without querying when no key is configured", async () => {
  delete process.env.UNCOIL_CONNECTION_KEY;
  let called = false;
  const result = await getProjectLlm(fakeClient(async () => { called = true; return secret; }), "p1");
  assert.equal(result, null);
  assert.equal(called, false);
});

test("getProjectLlm returns null when the project has no default connection", async () => {
  assert.equal(await getProjectLlm(fakeClient(async () => null), "p1"), null);
  assert.equal(g.__decrypts.length, 0);
});

test("getProjectLlm decrypts the secret and maps the connection", async () => {
  const args: unknown[][] = [];
  const result = await getProjectLlm(fakeClient(async (...a) => { args.push(a); return secret; }), "p1");
  assert.deepEqual(result, { apiKey: "plain:ct", baseUrl: secret.baseUrl, model: "m-1", provider: "custom" });
  assert.deepEqual(args[0], ["getDefaultSecret", { projectId: "p1" }]);
  assert.deepEqual(g.__decrypts[0], ["ct", "key"]);
});

test("getProjectLlm keeps a null default model", async () => {
  const result = await getProjectLlm(fakeClient(async () => ({ ...secret, defaultModel: null })), "p1");
  assert.equal(result?.model, null);
});

test("getProjectLlm swallows query failures and warns", async () => {
  const result = await getProjectLlm(fakeClient(async () => { throw new Error("boom"); }), "p1");
  assert.equal(result, null);
  assert.deepEqual(warnings[0], ["Project model connection could not be used:", "boom"]);
});

test("getProjectLlm swallows decrypt failures, including non-Error throws", async () => {
  g.__decryptError = "bad-cipher";
  const result = await getProjectLlm(fakeClient(async () => secret), "p1");
  assert.equal(result, null);
  assert.equal(warnings[0][1], "bad-cipher");
});
