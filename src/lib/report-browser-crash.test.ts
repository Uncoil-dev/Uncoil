import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { reportBrowserCrash } from "./report-browser-crash.ts";

// The module has no aliased imports, so only the browser globals are stubbed.
const g = globalThis as Record<string, unknown>;
function set(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
const names = ["window", "navigator", "fetch"] as const;
const saved = new Map<string, PropertyDescriptor | undefined>();

type Beacon = (url: string, body: string) => boolean;
type Call = { url: string; body: string; init?: RequestInit };

let beacons: Call[];
let fetches: Call[];

function stub(opts: { beacon?: Beacon | null; fetchImpl?: () => Promise<unknown> } = {}) {
  set("window", { location: { pathname: "/dashboard/p1/runs" } });
  set(
    "navigator",
    opts.beacon === null
      ? {}
      : {
          sendBeacon:
            opts.beacon ??
            ((url: string, body: string) => {
              beacons.push({ url, body });
              return true;
            }),
        },
  );
  set("fetch", (url: string, init: RequestInit) => {
    fetches.push({ url, body: String(init.body), init });
    return (opts.fetchImpl ?? (async () => ({})))();
  });
}

beforeEach(() => {
  beacons = [];
  fetches = [];
  for (const n of names) saved.set(n, Object.getOwnPropertyDescriptor(globalThis, n));
});

afterEach(() => {
  for (const n of names) {
    const d = saved.get(n);
    if (d) Object.defineProperty(globalThis, n, d);
    else delete g[n];
  }
});

test("sends the error payload through sendBeacon when it accepts the report", () => {
  stub();
  const err = Object.assign(new Error("boom"), { digest: "abc123" });
  reportBrowserCrash(err);
  assert.equal(beacons.length, 1);
  assert.equal(fetches.length, 0);
  assert.equal(beacons[0].url, "/api/crash");
  assert.deepEqual(JSON.parse(beacons[0].body), {
    message: "boom",
    stack: err.stack,
    digest: "abc123",
    route: "/dashboard/p1/runs",
  });
});

test("omits digest from the payload when the error has none", () => {
  stub();
  reportBrowserCrash(new Error("no digest"));
  const payload = JSON.parse(beacons[0].body);
  assert.equal("digest" in payload, false);
  assert.equal(payload.message, "no digest");
});

test("falls back to keepalive fetch when sendBeacon returns false", () => {
  stub({ beacon: () => false });
  reportBrowserCrash(new Error("queue full"));
  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url, "/api/crash");
  assert.equal(fetches[0].init?.method, "POST");
  assert.equal(fetches[0].init?.keepalive, true);
  assert.equal(JSON.parse(fetches[0].body).message, "queue full");
});

test("falls back to fetch when sendBeacon is unavailable", () => {
  stub({ beacon: null });
  reportBrowserCrash(new Error("no beacon"));
  assert.equal(fetches.length, 1);
});

test("swallows rejected fetch calls", async () => {
  stub({ beacon: null, fetchImpl: () => Promise.reject(new Error("offline")) });
  assert.doesNotThrow(() => reportBrowserCrash(new Error("x")));
  await new Promise((r) => setImmediate(r));
});

test("never throws when browser globals are missing", () => {
  delete g.window;
  set("navigator", { sendBeacon: () => true });
  assert.doesNotThrow(() => reportBrowserCrash(new Error("ssr")));
});

test("never throws when sendBeacon itself throws", () => {
  stub({
    beacon: () => {
      throw new Error("blocked");
    },
  });
  assert.doesNotThrow(() => reportBrowserCrash(new Error("x")));
  assert.equal(fetches.length, 0);
});
