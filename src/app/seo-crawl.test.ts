import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { productFeatureSlugs } from "@/lib/product-features";
import robots from "./robots";
import sitemap from "./(frontend)/sitemap";
import nextConfig from "../../next.config";
import { useCases } from "@/lib/use-cases";

const BASE = "https://www.uncoil.dev";

function disallowed(): string[] {
  const rules = robots().rules;
  const star = (Array.isArray(rules) ? rules : [rules]).find((r) => r.userAgent === "*");
  const d = star?.disallow ?? [];
  return Array.isArray(d) ? d : [d];
}

describe("sitemap crawlability", () => {
  it("lists every product page from the shared product list", async () => {
    const products = (await sitemap()).map((e) => e.url).filter((url) => url.startsWith(`${BASE}/product/`));
    expect(products).toEqual(productFeatureSlugs.map((slug) => `${BASE}/product/${slug}`));
  });

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

  it("lists every use-case page from the shared use-case map", async () => {
    const pages = (await sitemap()).map((e) => e.url).filter((url) => url.startsWith(`${BASE}/use-cases/`));
    expect(pages).toEqual(Object.keys(useCases).map((slug) => `${BASE}/use-cases/${slug}`));
  });
});

describe("sitemap docs dates", () => {
  it("dates a doc by its lastUpdated value", async () => {
    const cwd = process.cwd();
    const workspace = mkdtempSync(join(tmpdir(), "uncoil-sitemap-docs-"));
    try {
      mkdirSync(join(workspace, "content", "docs"), { recursive: true });
      writeFileSync(join(workspace, "content", "docs", "dated.mdoc"), "---\nslug: dated\ntitle: Dated\ndescription: A dated page.\nsection: Start\nlastUpdated: \"2026-11-20\"\n---\n\nBody.\n");
      process.chdir(workspace);
      vi.resetModules();
      const { default: freshSitemap } = await import("./(frontend)/sitemap");
      const entry = (await freshSitemap()).find((e) => e.url === `${BASE}/docs/dated`);
      expect(entry?.lastModified).toEqual(new Date("2026-11-20T00:00:00.000Z"));
    } finally {
      process.chdir(cwd);
      rmSync(workspace, { recursive: true, force: true });
      vi.resetModules();
    }
  });
});
