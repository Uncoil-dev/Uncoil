import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// library-access.ts imports path-aliased and framework modules that plain
// Node cannot resolve, so a resolve hook swaps them for small stubs.
const stubs: Record<string, string> = {
  "convex/_generated/api": `export const api = { auth: { getCurrentIdentity: "id" } };`,
  "next/navigation": `
    export function redirect(url) { throw new Error("REDIRECT:" + url); }
    export function notFound() { throw new Error("NOT_FOUND"); }`,
  "@/lib/auth-server": `export const fetchAuthQuery = () => globalThis.__identity();`,
  "@/lib/admin-access": `export const DASHBOARD_ADMIN_EMAILS = new Set(["boss" + "@example.test"]);`,
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

type Identity = Record<string, unknown> | null;
const g = globalThis as unknown as { __identity: () => Promise<Identity> };
const { getLibraryAccess, requireLibraryAccess } = await import("./library-access.ts");

const ENV_KEYS = [
  "UNCOIL_LIBRARY_ORG_IDS",
  "UNCOIL_ADMIN_USER_IDS",
  "UNCOIL_LIBRARY_USER_IDS",
  "UNCOIL_LIBRARY_ADMIN_EMAILS",
];

function setIdentity(identity: Identity) {
  g.__identity = async () => identity;
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  setIdentity(null);
});

test("returns unauthenticated when there is no identity", async () => {
  assert.deepEqual(await getLibraryAccess(), { authenticated: false, authorized: false });
});

test("returns unauthenticated when the identity lookup throws", async () => {
  g.__identity = async () => {
    throw new Error("bad token");
  };
  assert.deepEqual(await getLibraryAccess(), { authenticated: false, authorized: false });
});

test("signed-in user with no matching config is not authorized", async () => {
  setIdentity({ subject: "user_1" });
  assert.deepEqual(await getLibraryAccess(), { authenticated: true, authorized: false });
});

test("allows listed user ids from both user env vars", async () => {
  process.env.UNCOIL_ADMIN_USER_IDS = "a, user_1 ,b";
  setIdentity({ subject: "user_1" });
  assert.equal((await getLibraryAccess()).authorized, true);

  delete process.env.UNCOIL_ADMIN_USER_IDS;
  process.env.UNCOIL_LIBRARY_USER_IDS = "user_2";
  setIdentity({ subject: "user_2" });
  assert.equal((await getLibraryAccess()).authorized, true);
});

test("allows built-in and configured admin emails case-insensitively", async () => {
  setIdentity({ subject: "u", email: "Boss" + "@Example.test" });
  assert.equal((await getLibraryAccess()).authorized, true);

  process.env.UNCOIL_LIBRARY_ADMIN_EMAILS = "extra" + "@example.test";
  setIdentity({ subject: "u", email: "EXTRA" + "@example.test" });
  assert.equal((await getLibraryAccess()).authorized, true);
});

test("approved organization requires an owner or admin role", async () => {
  process.env.UNCOIL_LIBRARY_ORG_IDS = "org_1";
  for (const [role, expected] of [
    ["owner", true],
    ["admin", true],
    ["member", false],
    [undefined, false],
  ] as const) {
    setIdentity({ subject: "u", org_id: "org_1", org_role: role });
    assert.equal((await getLibraryAccess()).authorized, expected, String(role));
  }
});

test("admin of an organization that is not approved is rejected", async () => {
  process.env.UNCOIL_LIBRARY_ORG_IDS = "org_1";
  setIdentity({ subject: "u", org_id: "org_2", org_role: "admin" });
  assert.equal((await getLibraryAccess()).authorized, false);
});

test("requireLibraryAccess redirects unauthenticated visitors", async () => {
  await assert.rejects(requireLibraryAccess(), /REDIRECT:\/sign-in\?redirect=%2Fadmin%2Flibrary/);
  await assert.rejects(requireLibraryAccess("/x?a=1"), /redirect=%2Fx%3Fa%3D1/);
});

test("requireLibraryAccess returns not found for unauthorized users", async () => {
  setIdentity({ subject: "u" });
  await assert.rejects(requireLibraryAccess(), /NOT_FOUND/);
});

test("requireLibraryAccess resolves for authorized users", async () => {
  process.env.UNCOIL_LIBRARY_USER_IDS = "u";
  setIdentity({ subject: "u" });
  await assert.doesNotReject(requireLibraryAccess());
});
