import { describe, expect, it } from "vitest";
import { COLUMN_DEFS } from "./trace-columns";
import { csvColumnValue, traceCsv, type ExportTrace } from "./trace-csv";
const row: ExportTrace = { runId: "run-full-id", traceName: "test", startedAt: "2026-10-14 10:00:00", lastSeenAt: "2026-10-14 10:00:01", durationMs: 1234, totalCostUsd: 0.0000123456, spanCount: 3, errorCount: 1, inputTokens: 1001, outputTokens: 11, modelId: "model", endUserId: "u", sessionId: "s", environment: "production", release: "v1", tags: ["two words", "comma,tag"], inputPreview: '"input"', outputPreview: '"output"', llmCalls: 2, toolCalls: 1, slowestStepMs: 1000, avgStepMs: 400, ttftMs: 22, retries: 0, timeouts: 0, firstErrorType: "Timeout", firstErrorMessage: 'line, "quoted"\nnext', rootType: "agent", tools: "search", models: "model", feedback: "up", meta: { mode: "fast", formula: "=HYPERLINK(1)" } };
describe("selected-column CSV", () => {
  it("exports only selected columns in the displayed order", () => {
    expect(traceCsv(["name", "cost", "meta:mode"], [row])).toBe('"Trace name","Cost (USD)","Metadata: mode"\r\n"test","0.0000123456","fast"');
  });
  it("covers every built-in column with a real nonempty value", () => {
    for (const def of COLUMN_DEFS) expect(csvColumnValue(def.id, row), def.id).not.toBe("");
  });
  it("preserves full ids, numeric precision, zeroes and UTC timestamps", () => {
    expect(csvColumnValue("traceId", row)).toBe(row.runId);
    expect(csvColumnValue("tokens", row)).toBe(1012);
    expect(csvColumnValue("retries", row)).toBe(0);
    expect(csvColumnValue("startedAt", row)).toBe("2026-10-14T10:00:00.000Z");
  });
  it("quotes commas, quotes, newlines and neutralizes spreadsheet formulas", () => {
    const csv = traceCsv(["firstErrorMessage", "meta:formula"], [row]);
    expect(csv).toContain('"line, ""quoted""\nnext"'); expect(csv).toContain('"\'=HYPERLINK(1)"');
  });
  it("keeps missing values empty and tags unambiguous", () => {
    expect(csvColumnValue("meta:absent", row)).toBe(""); expect(csvColumnValue("tags", row)).toBe(JSON.stringify(row.tags));
    expect(traceCsv(["bogus", "name", "name"], [row])).toBe('"Trace name"\r\n"test"');
  });
});
