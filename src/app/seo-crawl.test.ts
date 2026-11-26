import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./(frontend)/sitemap";
import nextConfig from "../../next.config";

const BASE = "https://www.uncoil.dev";

function disallowed(): string[] {
  const rules = robots().rules;
  const star = (Array.isArray(rules) ? rules : [rules]).find((r) => r.userAgent === "*");
  const d = star?.disallow ?? [];
  return Array.isArray(d) ? d : [d];
}

describe("sitemap crawlability", () => {
  it("lists only unique URLs that robots.txt allows and that do not redirect", async () => {
    const entries = await sitemap();
    const paths = entries.map((e) => e.url.replace(BASE, "") || "/");
    expect(new Set(paths).size).toBe(paths.length);

    const blocked = paths.filter((p) => disallowed().some((d) => p.startsWith(d)));
    expect(blocked).toEqual([]);

    const redirects = (await nextConfig.redirects?.()) ?? [];
    const redirected = new Set(redirects.filter((r) => !/[:(*]/.test(r.source)).map((r) => r.source));
    expect(paths.filter((p) => redirected.has(p))).toEqual([]);

    expect(entries.every((e) => e.url.startsWith(`${BASE}/`) || e.url === BASE)).toBe(true);
  });
});
