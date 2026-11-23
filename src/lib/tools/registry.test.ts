import assert from "node:assert/strict";
import test from "node:test";
import { getTool, toolPath, tools } from "./registry.ts";
import { getModel, models, providers } from "./models.ts";

const groups = ["Debug", "Cost", "Build", "Live"];

test("tool slugs are unique, URL-safe and non-empty", () => {
  assert.ok(tools.length > 0);
  const slugs = tools.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("every tool has required fields filled in", () => {
  for (const t of tools) {
    for (const key of ["slug", "name", "title", "description", "blurb", "trackLine"] as const) {
      assert.ok(t[key].trim().length > 0, `${t.slug}.${key} is empty`);
    }
    assert.ok(groups.includes(t.group), `${t.slug} has unknown group ${t.group}`);
  }
});

test("getTool returns a known tool and throws for an unknown one", () => {
  for (const t of tools) assert.equal(getTool(t.slug), t);
  assert.throws(() => getTool("no-such-tool"), /Unknown tool: no-such-tool/);
});

test("toolPath builds the public path", () => {
  assert.equal(toolPath("abc"), "/tools/abc");
  assert.equal(toolPath(tools[0].slug), `/tools/${tools[0].slug}`);
});

test("model ids are unique and required fields are present", () => {
  assert.ok(models.length > 0);
  assert.equal(new Set(models.map((m) => m.id)).size, models.length);
  for (const m of models) {
    assert.ok(m.id.trim().length > 0);
    assert.ok(m.name.trim().length > 0, `${m.id} name`);
    assert.ok(providers.includes(m.provider), `${m.id} provider`);
    assert.ok(m.family.trim().length > 0, `${m.id} family`);
  }
});

test("getModel finds a model by id and returns undefined otherwise", () => {
  for (const m of models) assert.equal(getModel(m.id), m);
  assert.equal(getModel("no-such-model"), undefined);
  assert.equal(getModel(""), undefined);
});
