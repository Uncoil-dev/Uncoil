import { describe, expect, it } from "vitest";
import { NAV_MENUS, NAV_PRICING } from "../nav-links";
import { buildTrace, findHere, onLine, pitch, reaches } from "./trace";

describe("phone menu: the site as a trace", () => {
  const { sections, total } = buildTrace();

  it("reaches every destination the desktop navbar links to", () => {
    const desktop = [
      ...Object.values(NAV_MENUS).flatMap((m) => [...m.links.map(([, , href]) => href), m.feature.href]),
      NAV_PRICING.href,
    ];
    expect(desktop.filter((href) => !reaches(sections, href))).toEqual([]);
    expect(sections.map((s) => s.name)).toEqual([...Object.keys(NAV_MENUS), NAV_PRICING.label]);
  });

  it("lays every page end to end, one cell each, in menu order", () => {
    expect(total).toBe(sections.reduce((n, s) => n + s.len, 0));
    for (let i = 1; i < sections.length; i++) expect(sections[i].start).toBe(sections[i - 1].start + sections[i - 1].len);
    expect(sections.at(-1)).toMatchObject({ href: NAV_PRICING.href, len: 1 });
  });

  it("marks the page you are on, falling back to the closest parent page", () => {
    const docs = findHere(sections, "/docs/");
    expect(docs && sections[docs.section].links[docs.link].href).toBe("/docs");
    const python = findHere(sections, "/docs/python?x=1");
    expect(python && sections[python.section].links[python.link].href).toBe("/docs/python");
    const post = findHere(sections, "/blog/some-post");
    expect(post && sections[post.section].links[post.link].href).toBe("/blog");
  });

  it("has no step for pages outside the menu, and says so", () => {
    expect(findHere(sections, "/")).toBeNull();
    expect(findHere(sections, "/privacy")).toBeNull();
    expect(onLine(null, "/")).toBe("on / · home");
    expect(onLine(null, "/privacy/")).toBe("on /privacy · off the menu");
  });

  it("fits pages in whole cells and never drops below two cells a page", () => {
    // 390px wide phone: 97 cells, minus 8 of padding and 12 kept for the caret.
    expect(pitch(89, total, 12)).toBe(3);
    expect(pitch(89, 6, 12)).toBe(12);
    expect(pitch(10, total, 12)).toBe(2);
  });
});
