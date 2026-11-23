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
      return next(specifier + (specifier.includes("_generated") ? ".js" : ".ts"), context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const store = await import("./board-store.ts");
const draftModule = await import("../../onboarding/onboarding-draft.ts");
type Draft = import("../../onboarding/onboarding-draft.ts").OnboardingDraft;

const globals = globalThis as Record<string, unknown>;
const hadWindow = "window" in globals;
const originalWindow = globals.window;

function stubWindow() {
  globals.window = new EventTarget();
}

function restoreWindow() {
  if (hadWindow) globals.window = originalWindow;
  else delete globals.window;
}

test("board-store re-exports moveWidget, which swaps neighbours and ignores out-of-range moves", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(store.moveWidget(ids, "b", -1), ["b", "a", "c"]);
  assert.deepEqual(store.moveWidget(ids, "b", 1), ["a", "c", "b"]);
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.equal(store.moveWidget(ids, "a", -1), ids);
  assert.equal(store.moveWidget(ids, "c", 1), ids);
  assert.equal(store.moveWidget(ids, "missing", 1), ids);
  assert.deepEqual(store.moveWidget([], "a", 1), []);
});

test("publishOnboardingDraft is a no-op without a window", () => {
  delete globals.window;
  try {
    assert.doesNotThrow(() => draftModule.publishOnboardingDraft({ name: "x" }));
  } finally {
    restoreWindow();
  }
});

test("onOnboardingDraft receives published drafts until unsubscribed", () => {
  stubWindow();
  try {
    const seen: Draft[] = [];
    const off = draftModule.onOnboardingDraft((draft) => seen.push(draft));
    // Earlier no-op publish must not have been remembered.
    assert.deepEqual(seen, []);
    draftModule.publishOnboardingDraft({ name: "Acme" });
    draftModule.publishOnboardingDraft({});
    assert.deepEqual(seen, [{ name: "Acme" }, {}]);
    off();
    draftModule.publishOnboardingDraft({ runtime: "node" });
    assert.equal(seen.length, 2);
  } finally {
    restoreWindow();
  }
});

test("late subscribers get the merged latest draft once", () => {
  stubWindow();
  try {
    draftModule.publishOnboardingDraft({ keyCopied: true });
    const seen: Draft[] = [];
    const off = draftModule.onOnboardingDraft((draft) => seen.push(draft));
    off();
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0], { name: "Acme", runtime: "node", keyCopied: true });
  } finally {
    restoreWindow();
  }
});
