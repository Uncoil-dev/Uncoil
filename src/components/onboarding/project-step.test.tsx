import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// External services and framework pieces only: Convex, the auth client, the Next.js router and image.
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: { user: { email: "a@example.com", name: "A" } }, isPending: false }) },
}));

const { ProjectStep } = await import("./project-step");

describe("ProjectStep", () => {
  it("starts with a project name so the first step is one click", () => {
    const html = renderToStaticMarkup(createElement(ProjectStep));
    expect(html).toMatch(/<input[^>]*id="project-name"[^>]*value="my-first-agent"/);
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
    expect(submit).toContain('type="submit"');
    expect(submit).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});
