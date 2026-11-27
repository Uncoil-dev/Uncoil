import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const saved = vi.hoisted(() => ({ sdk: null as "python" | "typescript" | null }));

vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return {
    useQuery: (query: Parameters<typeof getFunctionName>[0]) => (getFunctionName(query) === "projects:getProjectById" ? { onboardingSdk: saved.sdk } : []),
    useMutation: () => () => Promise.resolve(null),
  };
});

const { QuickstartGuide } = await import("./quickstart-guide");

function selectedTab(): string | undefined {
  const html = renderToStaticMarkup(createElement(QuickstartGuide, { projectId: "p1" }));
  return html.match(/role="tab" aria-selected="true"[^>]*>(\w+)</)?.[1];
}

describe("quickstart language", () => {
  it("preselects the language saved on the project", () => {
    saved.sdk = "typescript";
    expect(selectedTab()).toBe("typescript");
  });

  it("starts with Python when the project has no saved language", () => {
    saved.sdk = null;
    expect(selectedTab()).toBe("python");
  });
});
