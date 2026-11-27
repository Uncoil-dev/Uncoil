import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { answers } from "@/lib/answers";
import { tools } from "@/lib/tools/registry";

describe("llms-full.txt", () => {
  const originalCwd = process.cwd();
  let workspace = "";

  afterEach(() => {
    process.chdir(originalCwd);
    if (workspace) rmSync(workspace, { recursive: true, force: true });
    vi.resetModules();
  });

  // An empty docs folder keeps the docs pages out of the output.
  async function render() {
    workspace = mkdtempSync(join(tmpdir(), "uncoil-llms-full-"));
    mkdirSync(join(workspace, "content", "docs"), { recursive: true });
    process.chdir(workspace);
    vi.resetModules();
    const { GET } = await import("./route");
    return (await GET()).text();
  }

  it("lists every answer with its question, answer and URL", async () => {
    const text = await render();
    expect(text).toContain("## Answers\n");
    for (const a of answers) {
      expect(text).toContain(`### ${a.question}\n${a.answer}\nhttps://www.uncoil.dev/answers/${a.slug}`);
    }
  });

  it("lists every free tool with its name, one line and URL", async () => {
    const text = await render();
    expect(text).toContain("## Free tools\n");
    for (const t of tools) {
      expect(text).toContain(`- [${t.name}](https://www.uncoil.dev/tools/${t.slug}): ${t.blurb}`);
    }
  });
});
