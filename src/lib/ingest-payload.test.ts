import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePayload } from "./ingest-payload.ts";

test("the HTTP snippet on the site posts a span that ingest accepts", () => {
  const source = readFileSync(new URL("../components/marketing/company/code-tabs.tsx", import.meta.url), "utf8");
  const body = source.match(/api\/ingest[\s\S]*?-d '([^']*)'/)?.[1];
  assert.ok(body, "HTTP snippet body not found");
  const result = validatePayload(JSON.parse(body));
  assert.ok(result.ok, result.ok ? undefined : result.error);
});
