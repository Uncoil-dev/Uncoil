import { describe, expect, it, vi } from "vitest";
import TracingDetailPage from "./page";

// The explorer is a client component backed by live data; this test only reads what the page passes to it.
vi.mock("@/components/dashboard/tracing/tracing-explorer", () => ({ TracingExplorer: () => null }));

describe("shared trace link page", () => {
  it("opens the trace list over 90 days so older traces keep their row", async () => {
    const page = await TracingDetailPage({ params: Promise.resolve({ projectId: "p1", runId: "run%2F45" }) });
    expect(page.props.initialQuery).toEqual({ range: "90d", trace: "run/45" });
  });
});
