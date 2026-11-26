import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// The glossary modules use extensionless relative imports, which plain Node
// cannot resolve. A resolve hook maps relative and "@/" specifiers to .ts.
const srcUrl = pathToFileURL(process.cwd() + "/src/").href;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context);
    }
    if (specifier.startsWith(".") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const { glossaryTerms } = await import("../glossary.ts");
const { modelTerms } = await import("./models.ts");
const { tracingTerms } = await import("./tracing.ts");
const { agentTerms } = await import("./agents.ts");
const { opsTerms } = await import("./ops.ts");

const slugs = new Set<string>(glossaryTerms.map((t: { slug: string }) => t.slug));
const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;

test("data files are non-empty and all included in the aggregate", () => {
  for (const list of [modelTerms, tracingTerms, agentTerms, opsTerms]) {
    assert.ok(list.length > 0);
    for (const term of list) assert.ok(glossaryTerms.includes(term), term.slug);
  }
});

test("slugs are unique and URL safe", () => {
  assert.equal(slugs.size, glossaryTerms.length);
  for (const t of glossaryTerms) assert.match(t.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, t.slug);
});

test("required fields are non-empty", () => {
  for (const t of glossaryTerms) {
    for (const key of ["slug", "term", "definition", "expansion"] as const) {
      assert.ok(filled(t[key]), `${t.slug}: ${key}`);
    }
    assert.ok(Array.isArray(t.related) && t.related.length > 0, `${t.slug}: related`);
  }
});

test("optional text fields, when present, are non-empty", () => {
  for (const t of glossaryTerms) {
    for (const key of ["group", "example", "inPractice"] as const) {
      if (t[key] !== undefined) assert.ok(filled(t[key]), `${t.slug}: ${key}`);
    }
    if (t.link) {
      assert.ok(filled(t.link.label), `${t.slug}: link label`);
      assert.match(t.link.href, /^\/[a-z0-9\-/]*$/, `${t.slug}: link href`);
    }
  }
});

test("related entries resolve to other glossary terms", () => {
  for (const t of glossaryTerms) {
    assert.equal(new Set(t.related).size, t.related.length, `${t.slug}: duplicate related`);
    for (const r of t.related) {
      assert.ok(slugs.has(r), `${t.slug} -> ${r}`);
      assert.notEqual(r, t.slug, `${t.slug} relates to itself`);
    }
  }
});
