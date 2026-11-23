import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// The registry uses extensionless relative imports and the "@/" alias, which
// plain Node cannot resolve. A resolve hook maps both to .ts files.
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

const { answers } = await import("./index.ts");
const { coreAnswers } = await import("./core.ts");

const slugs = new Set<string>(answers.map((a: { slug: string }) => a.slug));
const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;

test("registry is non-empty and includes the core answers", () => {
  assert.ok(answers.length > 0);
  for (const core of coreAnswers) assert.ok(answers.includes(core), core.slug);
});

test("slugs are unique and URL safe", () => {
  assert.equal(slugs.size, answers.length);
  for (const a of answers) assert.match(a.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, a.slug);
});

test("required text fields are non-empty", () => {
  for (const a of answers) {
    for (const key of ["slug", "question", "title", "answer"] as const) {
      assert.ok(filled(a[key]), `${a.slug}: ${key}`);
    }
    assert.ok(filled(a.link.href) && filled(a.link.label), `${a.slug}: link`);
    assert.ok(a.points.length > 0, `${a.slug}: points`);
    for (const p of a.points) assert.ok(filled(p.heading) && filled(p.body), `${a.slug}: point`);
    assert.ok(a.related.length > 0, `${a.slug}: related`);
    for (const r of a.related) assert.ok(filled(r.href) && filled(r.label), `${a.slug}: related`);
  }
});

test("links are internal absolute paths", () => {
  for (const a of answers) {
    for (const l of [a.link, ...a.related]) {
      assert.ok(l.href.startsWith("/") && !l.href.startsWith("//"), `${a.slug}: ${l.href}`);
    }
  }
});

test("links into /answers/ resolve to a registered answer", () => {
  for (const a of answers) {
    for (const l of [a.link, ...a.related]) {
      const m = /^\/answers\/([^/?#]+)/.exec(l.href);
      if (m) assert.ok(slugs.has(m[1]), `${a.slug} links to unknown answer ${l.href}`);
    }
  }
});
