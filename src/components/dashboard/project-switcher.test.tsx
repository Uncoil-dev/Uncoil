import { createElement, Fragment, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({ useQuery: () => [] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), useParams: () => ({}) }));
// Render the menu open and inline so its items show up in static markup.
vi.mock("@radix-ui/react-dropdown-menu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@radix-ui/react-dropdown-menu")>();
  return {
    ...actual,
    Root: (props: ComponentProps<typeof actual.Root>) => createElement(actual.Root, { ...props, open: true }),
    Portal: ({ children }: { children?: ReactNode }) => createElement(Fragment, null, children),
  };
});

const { ProjectSwitcher } = await import("./project-switcher");

describe("ProjectSwitcher", () => {
  it("tells a new account how to create its first project", () => {
    const html = renderToStaticMarkup(createElement(ProjectSwitcher));
    expect(html).toContain("No projects yet. Use New project below to start.");
  });
});
