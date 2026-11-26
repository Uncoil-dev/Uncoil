import { describe, expect, it } from "vitest";
import { buildTrace, findHere } from "./trace";

describe("site as a trace", () => {
  const { sections, total } = buildTrace();

  it("lays every desktop menu page end to end, one cell each, in menu order", () => {
    expect(sections.map((s) => s.name)).toEqual(["Product", "Solutions", "Developers", "Company", "Pricing"]);
    expect(total).toBe(25);
    for (let i = 1; i < sections.length; i++) expect(sections[i].start).toBe(sections[i - 1].start + sections[i - 1].len);
    expect(sections[2].links[0]).toMatchObject({ label: "Docs", href: "/docs" });
    expect(sections[4]).toMatchObject({ href: "/pricing", len: 1, start: 24 });
  });

  it("marks the page you are on, falling back to the closest parent page", () => {
    expect(findHere(sections, "/docs/")).toEqual({ section: 2, link: 0, cell: 12 });
    expect(findHere(sections, "/docs/python?x=1")).toEqual({ section: 2, link: 2, cell: 14 });
    expect(findHere(sections, "/blog/some-post")).toEqual({ section: 3, link: 0, cell: 18 });
    // A page listed twice is marked where it first appears.
    expect(findHere(sections, "/integrations")?.section).toBe(0);
    expect(findHere(sections, "/")).toBeNull();
  });
});
