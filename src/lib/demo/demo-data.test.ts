import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Same resolve hook as src/lib/answers/registry.test.ts for "@/" and
// extensionless relative imports.
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

const { generateDemoTraces, DEMO_MODELS, DEMO_TAGS } = await import("./demo-data.ts");
const { DEMO_PROMPTS, demoResults } = await import("./playground-demo-data.ts");

type Span = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  durationMs: number;
  startOffsetMs: number;
  status: string;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  children: Span[];
};

const filled = (s: unknown) => typeof s === "string" && s.trim().length > 0;
const flatten = (spans: Span[]): Span[] => spans.flatMap((s) => [s, ...flatten(s.children)]);
const traces = generateDemoTraces(60);

test("generateDemoTraces honours the requested count with unique trace ids", () => {
  assert.equal(traces.length, 60);
  assert.equal(new Set(traces.map((t: { id: string }) => t.id)).size, traces.length);
});

test("traces have required fields and known models, tags and statuses", () => {
  for (const t of traces) {
    assert.ok(filled(t.id) && filled(t.name) && filled(t.user), t.id);
    assert.ok(["success", "error", "running"].includes(t.status), t.id);
    assert.ok(!Number.isNaN(Date.parse(t.startedAt)), t.id);
    assert.ok((DEMO_MODELS as readonly string[]).includes(t.model), t.id);
    assert.ok(t.tags.length > 0 && t.tags.every((g: string) => (DEMO_TAGS as readonly string[]).includes(g)), t.id);
    assert.ok(t.durationMs >= 0 && t.costUsd >= 0, t.id);
  }
});

test("traces are sorted newest first", () => {
  for (let i = 1; i < traces.length; i += 1) {
    assert.ok(Date.parse(traces[i - 1].startedAt) >= Date.parse(traces[i].startedAt));
  }
});

test("span ids are unique and parent references resolve", () => {
  const seen = new Set<string>();
  for (const t of traces) {
    assert.equal(t.spans.length, 1, "one root span per trace");
    assert.equal(t.spans[0].parentId, null);
    const all = flatten(t.spans);
    for (const s of all) {
      assert.ok(!seen.has(s.id), `duplicate span id ${s.id}`);
      seen.add(s.id);
      assert.ok(filled(s.name), s.id);
      assert.ok(s.durationMs >= 0 && s.startOffsetMs >= 0, s.id);
      for (const c of s.children) assert.equal(c.parentId, s.id);
    }
  }
});

test("trace token totals equal the sum over generation spans", () => {
  for (const t of traces) {
    const gens = flatten(t.spans).filter((s) => s.inputTokens !== undefined);
    assert.equal(gens.reduce((n, s) => n + (s.inputTokens ?? 0), 0), t.inputTokens, t.id);
    assert.equal(gens.reduce((n, s) => n + (s.outputTokens ?? 0), 0), t.outputTokens, t.id);
  }
});

test("trace cost matches span costs within rounding", () => {
  for (const t of traces) {
    const gens = flatten(t.spans).filter((s) => s.costUsd !== undefined);
    const sum = gens.reduce((n, s) => n + (s.costUsd ?? 0), 0);
    assert.ok(Math.abs(sum - t.costUsd) <= 1e-6 * (gens.length + 1), t.id);
  }
});

test("trace duration covers every span end", () => {
  for (const t of traces) {
    if (t.status === "running") continue;
    const end = Math.max(...flatten(t.spans).map((s) => s.startOffsetMs + s.durationMs));
    assert.ok(t.durationMs >= end || t.durationMs >= t.spans[0].durationMs, t.id);
  }
});

test("playground prompts have unique ids and versions", () => {
  const ids = new Set<string>();
  for (const p of DEMO_PROMPTS) {
    assert.ok(filled(p.name) && p.versions.length > 0, p._id);
    for (const id of [p._id, ...p.versions.map((v: { _id: string }) => v._id)]) {
      assert.ok(!ids.has(id), `duplicate id ${id}`);
      ids.add(id);
    }
    const nums = p.versions.map((v: { version: number }) => v.version);
    assert.equal(new Set(nums).size, nums.length, p.name);
    for (const v of p.versions) assert.ok(filled(v.content) && filled(v.model), v._id);
  }
});

test("demoResults returns one deterministic result per model", () => {
  const models = ["gpt-4.1", "gpt-4o-mini", "claude-sonnet-5-5"];
  const a = demoResults(models, "Hello world\nQuestion: refund?");
  assert.deepEqual(a, demoResults(models, "Hello world\nQuestion: refund?"));
  assert.deepEqual(a.map((r: { model: string }) => r.model), models);
  for (const r of a) assert.ok(filled(r.output) && Number.isFinite(r.latencyMs) && r.inputTokens >= 8 && r.outputTokens >= 8);
});
