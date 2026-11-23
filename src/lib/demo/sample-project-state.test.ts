import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Resolve hook for "@/" and extensionless relative imports.
const srcUrl = pathToFileURL(process.cwd() + "/src/").href;
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(${JSON.stringify(srcUrl)} + specifier.slice(2) + ".ts", context);
    }
    if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const { sandboxWorkspace } = await import("../../features/dashboard-workspace/sandbox-data.ts");
const sampleState = await import("./sample-project-state.ts");

const collections = Object.entries(sandboxWorkspace.collections);

test("sample-project-state exposes the hidden-state hook", () => {
  assert.equal(typeof sampleState.useSampleProjectHidden, "function");
});

test("sandbox workspace has a read-only sandbox project identity", () => {
  assert.equal(sandboxWorkspace.mode, "sandbox");
  assert.equal(sandboxWorkspace.readOnly, true);
  assert.ok(sandboxWorkspace.project.id.length > 0);
  assert.ok(sandboxWorkspace.project.name.length > 0);
});

test("sandbox workspace metrics are finite and non-negative", () => {
  for (const value of Object.values(sandboxWorkspace.metrics)) {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0);
  }
});

test("sandbox environments and models start with all and have no duplicates", () => {
  for (const list of [sandboxWorkspace.environments, sandboxWorkspace.models]) {
    assert.equal(list[0], "all");
    assert.equal(new Set(list).size, list.length);
  }
});

test("every collection has a description and non-empty records", () => {
  assert.ok(collections.length > 0);
  for (const [key, collection] of collections) {
    assert.ok(collection.description.length > 0, `${key} description`);
    assert.ok(collection.records.length > 0, `${key} records`);
  }
});

test("every record has the required string fields", () => {
  for (const [key, collection] of collections) {
    for (const record of collection.records) {
      for (const field of ["id", "name", "status", "environment", "timestamp"] as const) {
        assert.equal(typeof record[field], "string", `${key}.${field}`);
      }
      assert.ok(record.id.length > 0, `${key} id`);
      assert.ok(record.name.length > 0, `${key} name`);
    }
  }
});

test("record ids are unique within each collection", () => {
  for (const [key, collection] of collections) {
    const ids = collection.records.map((record) => record.id);
    assert.equal(new Set(ids).size, ids.length, `${key} has duplicate ids`);
  }
});

test("record scores, when present, are numbers between 0 and 1", () => {
  for (const [key, collection] of collections) {
    for (const record of collection.records) {
      if (record.score === undefined || record.score === "") continue;
      const score = Number(record.score);
      if (Number.isNaN(score)) continue;
      assert.ok(score >= 0 && score <= 1, `${key} score ${record.score}`);
    }
  }
});

test("record costs, when present, are dollar amounts or a dash", () => {
  for (const [key, collection] of collections) {
    for (const record of collection.records) {
      if (record.cost === undefined) continue;
      assert.match(record.cost, /^(—|\$\d+(\.\d+)?)$/, `${key} cost ${record.cost}`);
    }
  }
});
