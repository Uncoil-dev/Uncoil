import { describe, expect, it } from "vitest";
import RunsPage from "@/app/(frontend)/dashboard/[projectId]/runs/page";
import { legacyRunQuery } from "./legacy-run-query";

describe("legacyRunQuery", () => {
  it("turns status=failed into the errors-only filter", () => {
    expect(legacyRunQuery({ status: "failed" })).toBe("status=error");
  });

  it("drops run statuses that Tracing cannot filter on", () => {
    expect(legacyRunQuery({ status: "running" })).toBe("");
  });

  it("turns days=N into a range of N days", () => {
    expect(legacyRunQuery({ days: "7" })).toBe("range=7d");
    expect(legacyRunQuery({ days: "90" })).toBe("range=90d");
  });

  it("uses the 24-hour range for days=1", () => {
    expect(legacyRunQuery({ days: "1" })).toBe("range=24h");
  });

  it("ignores a days value that is not a Tracing range", () => {
    expect(legacyRunQuery({ days: "abc" })).toBe("");
  });

  it("turns sort=duration into slowest first", () => {
    expect(legacyRunQuery({ sort: "duration" })).toBe("sort=latency&dir=desc");
  });

  it("renames model to modelId", () => {
    expect(legacyRunQuery({ model: "gpt-5" })).toBe("modelId=gpt-5");
  });

  it("keeps keys Tracing already understands", () => {
    expect(legacyRunQuery({ q: "timeout", trace: "run_1" })).toBe("q=timeout&trace=run_1");
  });
});

describe("old Runs page", () => {
  it("redirects to Tracing with the filters translated", async () => {
    const redirectTo = await RunsPage({
      params: Promise.resolve({ projectId: "p1" }),
      searchParams: Promise.resolve({ status: "failed", days: "7" }),
    }).then(() => null, (error: { digest?: string }) => error.digest?.split(";")[2]);
    expect(redirectTo).toBe("/dashboard/p1/tracing?status=error&range=7d");
  });
});
