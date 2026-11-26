import assert from "node:assert/strict";
import test from "node:test";
import { copyToClipboard, setupPrompt, SETUP_STEPS } from "../../../lib/setup-prompt.ts";

test("the setup prompt lists every shared step and names the agent when given", () => {
  const prompt = setupPrompt("Cursor");
  assert.match(prompt, /\(Cursor\)/);
  SETUP_STEPS.forEach((step, i) => assert.ok(prompt.includes(`${i + 1}. ${step}`)));
  assert.equal(setupPrompt().split("\n")[0], "Set up Uncoil tracing in this project.");
});

test("copyToClipboard uses the Clipboard API when it works", async () => {
  let written = "";
  const ok = await copyToClipboard("hi", { write: async (t) => void (written = t), legacy: () => assert.fail("legacy not needed") });
  assert.equal(ok, true);
  assert.equal(written, "hi");
});

test("copyToClipboard falls back to the legacy path when the API is blocked", async () => {
  const ok = await copyToClipboard("hi", { write: async () => { throw new Error("blocked"); }, legacy: () => true });
  assert.equal(ok, true);
});

test("copyToClipboard resolves false when both paths are blocked", async () => {
  const ok = await copyToClipboard("hi", { write: async () => { throw new Error("blocked"); }, legacy: () => false });
  assert.equal(ok, false);
});
