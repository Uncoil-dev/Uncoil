import assert from "node:assert/strict";
import test from "node:test";
import { ConvexError } from "convex/values";
import { projectCreateError } from "./project-errors.ts";

test("string ConvexError data becomes the message with an empty code", () => {
  assert.deepEqual(projectCreateError(new ConvexError("Plan limit reached")), {
    code: "",
    message: "Plan limit reached",
  });
});

test("object ConvexError data keeps its code and message", () => {
  const err = new ConvexError({ code: "LIMIT", message: "Too many projects" });
  assert.deepEqual(projectCreateError(err), { code: "LIMIT", message: "Too many projects" });
});

test("object ConvexError data without fields falls back", () => {
  assert.deepEqual(projectCreateError(new ConvexError({})), {
    code: "",
    message: "Project creation failed.",
  });
  assert.deepEqual(projectCreateError(new ConvexError({ code: "X" }), "Custom"), {
    code: "X",
    message: "Custom",
  });
});

test("plain errors use their own message", () => {
  assert.deepEqual(projectCreateError(new Error("boom")), { code: "", message: "boom" });
});

test("unknown values use the fallback", () => {
  assert.deepEqual(projectCreateError("oops"), { code: "", message: "Project creation failed." });
  assert.deepEqual(projectCreateError(null, "Nope"), { code: "", message: "Nope" });
});
