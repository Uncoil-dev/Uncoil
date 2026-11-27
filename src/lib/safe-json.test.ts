import { expect, test } from "vitest";
import { loadErrorMessage, readJson } from "./safe-json.ts";

test("readJson parses a valid JSON body", async () => {
  const body = await readJson<{ id: string }>(new Response(JSON.stringify({ id: "abc", error: "nope" })));
  expect(body).toEqual({ id: "abc", error: "nope" });
});

test("readJson returns an empty object for a non-JSON body", async () => {
  expect(await readJson(new Response("<html>502 Bad Gateway</html>", { status: 502 }))).toEqual({});
});

test("readJson returns an empty object for an empty body", async () => {
  expect(await readJson(new Response(""))).toEqual({});
  expect(await readJson(new Response(null, { status: 204 }))).toEqual({});
});

test("loadErrorMessage prefers the server's message and otherwise names the status code", () => {
  expect(loadErrorMessage({ error: "Project not found" }, 404, "Tracing")).toBe("Project not found");
  expect(loadErrorMessage({}, 502, "Tracing")).toBe("Tracing couldn't load (error 502). Try again.");
});
