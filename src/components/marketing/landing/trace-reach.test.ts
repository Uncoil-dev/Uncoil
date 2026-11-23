import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Resolve hook so extensionless relative imports and the "@/" alias map to .ts
// files, matching src/lib/answers/registry.test.ts.
const srcUrl = pathToFileURL(process.cwd() + "/src/").href;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context);
    }
    if (specifier.startsWith("./") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const { traceReachY } = await import("./trace-reach.ts");
const { SAMPLE_PAGES } = await import("../../demo/sample-pages.ts");

type Box = { top: number; height: number };
const box = (b: Box) => ({ getBoundingClientRect: () => b });

// Minimal stand-ins for the DOM nodes traceReachY touches.
function fakeItem(opts: { col?: Box; tick?: Box; self?: Box }) {
  const self = box(opts.self ?? { top: 0, height: 0 });
  return {
    ...self,
    closest: (sel: string) => (sel === "[data-trace-col]" && opts.col ? box(opts.col) : null),
    querySelector: (sel: string) => (sel === "[data-trace-tick]" && opts.tick ? box(opts.tick) : null),
  } as unknown as HTMLElement;
}

test("traceReachY returns 0 without a trace column", () => {
  assert.equal(traceReachY(fakeItem({ tick: { top: 50, height: 10 } })), 0);
});

test("traceReachY measures the tick centre from the column top", () => {
  const item = fakeItem({ col: { top: 100, height: 400 }, tick: { top: 160, height: 12 } });
  assert.equal(traceReachY(item), 66);
});

test("traceReachY falls back to the item when there is no tick", () => {
  const item = fakeItem({ col: { top: 10, height: 300 }, self: { top: 50, height: 20 } });
  assert.equal(traceReachY(item), 50);
});

test("traceReachY never returns a negative offset", () => {
  const item = fakeItem({ col: { top: 200, height: 300 }, tick: { top: 100, height: 10 } });
  assert.equal(traceReachY(item), 0);
});

const pages = Object.entries(SAMPLE_PAGES) as [string, any][];
const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;

test("SAMPLE_PAGES is non-empty with unique, lowercase slug keys and titles", () => {
  assert.ok(pages.length > 0);
  for (const [slug] of pages) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  const titles = pages.map(([, p]) => p.title);
  assert.equal(new Set(titles).size, titles.length);
});

test("every sample page has required text fields and at least one table", () => {
  for (const [slug, p] of pages) {
    assert.ok(filled(p.title), `${slug} title`);
    assert.ok(filled(p.intro), `${slug} intro`);
    assert.ok(filled(p.cta), `${slug} cta`);
    assert.ok(Array.isArray(p.tables) && p.tables.length > 0, `${slug} tables`);
  }
});

test("every table has a title, headings, and rows matching the heading count", () => {
  for (const [slug, p] of pages) {
    for (const t of p.tables) {
      assert.ok(filled(t.title), `${slug} table title`);
      assert.ok(t.head.length > 0 && t.head.every(filled), `${slug} head`);
      assert.ok(t.rows.length > 0, `${slug} rows`);
      for (const row of t.rows) {
        assert.equal(row.length, t.head.length, `${slug}/${t.title} row width`);
        assert.ok(row.every(filled), `${slug}/${t.title} cell`);
      }
      for (const i of t.right ?? []) {
        assert.ok(Number.isInteger(i) && i >= 0 && i < t.head.length, `${slug} right index ${i}`);
      }
    }
  }
});
