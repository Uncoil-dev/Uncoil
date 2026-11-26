import { describe, expect, it } from "vitest";
import { findPages } from "./match";
import { ALL } from "./menu-data";

const top = (q: string) => findPages(ALL, q)[0]?.hit.title;

describe("console menu page finder", () => {
  it("lands short inputs on the page people mean", () => {
    expect(top("pri")).toBe("Pricing");
    expect(top("py")).toBe("Python SDK");
    expect(top("ts")).toBe("TypeScript SDK");
    expect(top("sign")).toBe("Sign in");
    expect(top("/docs")).toBe("Docs");
  });

  it("marks the typed letters in the title for highlighting", () => {
    expect(findPages(ALL, "py")[0].marks).toEqual([[0, 2]]);
    expect(findPages(ALL, "sdk").map((m) => m.hit.title).slice(0, 2)).toEqual(["TypeScript SDK", "Python SDK"]);
  });

  it("forgives a dropped letter and lists a whole group by its name", () => {
    expect(top("chnglog")).toBe("Changelog");
    expect(findPages(ALL, "develop").map((m) => m.hit.group)).toEqual(Array(6).fill("Developers"));
  });

  it("finds every page by its own title and never lists one address twice", () => {
    for (const hit of ALL) expect(findPages(ALL, hit.title)[0].hit.href).toBe(hit.href);
    const hrefs = findPages(ALL, "o", 50).map((m) => m.hit.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("returns nothing for an empty prompt or a miss", () => {
    expect(findPages(ALL, "   ")).toEqual([]);
    expect(findPages(ALL, "zzqx")).toEqual([]);
  });
});
