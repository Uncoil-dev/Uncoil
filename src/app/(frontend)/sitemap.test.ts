import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const doc = (slug: string, extra = "") =>
  `---\nslug: ${slug}\ntitle: ${slug}\ndescription: A ${slug} page.\nsection: Start\n${extra}---\n\nBody.\n`;

describe("sitemap docs entries", () => {
  const originalCwd = process.cwd();
  let workspace = "";

  afterEach(() => {
    process.chdir(originalCwd);
    if (workspace) rmSync(workspace, { recursive: true, force: true });
    vi.resetModules();
  });

  it("lists public docs and leaves out docs marked noindex", async () => {
    workspace = mkdtempSync(join(tmpdir(), "uncoil-sitemap-"));
    mkdirSync(join(workspace, "content", "docs"), { recursive: true });
    writeFileSync(join(workspace, "content", "docs", "visible.mdoc"), doc("visible"));
    writeFileSync(join(workspace, "content", "docs", "hidden.mdoc"), doc("hidden", "noindex: true\n"));
    process.chdir(workspace);
    vi.resetModules();

    const { default: sitemap } = await import("./sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://www.uncoil.dev/docs/visible");
    expect(urls).not.toContain("https://www.uncoil.dev/docs/hidden");
  });
});
