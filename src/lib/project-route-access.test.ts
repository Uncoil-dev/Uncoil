import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test, { beforeEach } from "node:test";

// project-route-access.ts imports path-aliased and framework modules that plain
// Node cannot resolve, so a resolve hook swaps them for small stubs. The real
// access-cache module is used so the caching behavior is exercised end to end.
const stubs: Record<string, string> = {
  "next/server": `
    export const NextResponse = {
      json: (body, init) => ({ body, status: init?.status ?? 200 }),
    };`,
  "convex/_generated/api": `export const api = { projects: { getProjectById: "getProjectById" } };`,
  "@/lib/auth-server": `export const isAuthenticated = async () => globalThis.__authed;`,
  "@/lib/convex-server": `
    export const getAuthedConvexClient = async () => ({
      query: async (...args) => {
        globalThis.__queries.push(args);
        return globalThis.__project;
      },
    });`,
};
const realModules: Record<string, string> = {
  "@/lib/access-cache": pathToFileURL(new URL("./access-cache.ts", import.meta.url).pathname).href,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  const real = ${JSON.stringify(realModules)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    if (specifier in real) return { url: real[specifier], shortCircuit: true };
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as {
  __authed: boolean;
  __project: unknown;
  __queries: unknown[][];
};
const { denyProjectAccess } = await import("./project-route-access.ts");

type Denied = { body: unknown; status: number } | null;
const deny = (request: unknown, projectId: string) =>
  denyProjectAccess(request as never, projectId) as unknown as Promise<Denied>;

function fakeRequest(session: string | null) {
  const cookies = session ? [{ name: "app_session_token", value: session }] : [];
  return { cookies: { getAll: () => cookies } };
}

beforeEach(() => {
  g.__authed = true;
  g.__project = { _id: "p1" };
  g.__queries = [];
});

test("returns 401 when the viewer is not signed in", async () => {
  g.__authed = false;
  const result = await deny(fakeRequest("s-unauth"), "p1");
  assert.equal(result?.status, 401);
  assert.deepEqual(result?.body, { error: "Unauthorized" });
  assert.equal(g.__queries.length, 0);
});

test("returns 404 when the project does not exist", async () => {
  g.__project = null;
  const result = await deny(fakeRequest("s-missing"), "p404");
  assert.equal(result?.status, 404);
  assert.deepEqual(result?.body, { error: "Project not found" });
});

test("allows access and passes the project id to the query", async () => {
  const result = await deny(fakeRequest("s-ok"), "p-ok");
  assert.equal(result, null);
  assert.deepEqual(g.__queries[0], ["getProjectById", { projectId: "p-ok" }]);
});

test("skips the Convex query after a recent success for the same session", async () => {
  assert.equal(await deny(fakeRequest("s-cache"), "p-cache"), null);
  g.__authed = false;
  assert.equal(await deny(fakeRequest("s-cache"), "p-cache"), null);
  assert.equal(g.__queries.length, 1);
});

test("does not reuse cached access for another session or project", async () => {
  assert.equal(await deny(fakeRequest("s-a"), "p-x"), null);
  g.__authed = false;
  assert.equal((await deny(fakeRequest("s-b"), "p-x"))?.status, 401);
  assert.equal((await deny(fakeRequest("s-a"), "p-y"))?.status, 401);
});

test("never caches requests without a session cookie", async () => {
  assert.equal(await deny(fakeRequest(null), "p-anon"), null);
  assert.equal(await deny(fakeRequest(null), "p-anon"), null);
  assert.equal(g.__queries.length, 2);
});
