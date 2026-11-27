import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getFunctionName, type FunctionReference } from "convex/server";

const overview = { rules: [] as unknown[], planTier: "pro" };

vi.mock("convex/react", () => ({
  useQuery: (fn: FunctionReference<"query">) => (getFunctionName(fn) === "alertRules:overview" ? overview : undefined),
  useMutation: () => async () => null,
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null }) } }));

const { default: AlertsPage } = await import("../../../app/(frontend)/dashboard/[projectId]/alerts/page");

async function renderAlerts(searchParams: Record<string, string>) {
  const page = await AlertsPage({ params: Promise.resolve({ projectId: "p1" }), searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(page);
}

describe("alerts page", () => {
  it("opens the new rule form for view=create", async () => {
    overview.planTier = "pro";
    expect(await renderAlerts({ view: "create" })).toContain('aria-label="New alert rule"');
    expect(await renderAlerts({})).not.toContain('aria-label="New alert rule"');
  });

  it("shows the upgrade prompt instead of the form on the Free plan", async () => {
    overview.planTier = "free";
    const html = await renderAlerts({ view: "create" });
    expect(html).not.toContain('aria-label="New alert rule"');
    expect(html).toContain("Get told by email or Slack");
  });
});
