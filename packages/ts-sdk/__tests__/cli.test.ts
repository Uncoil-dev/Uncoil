import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCommand, sdkVersion } from "../src/cli";
import { formatTopics, runTopics } from "../src/topics";

describe("package bin", () => {
  it("names a bin after the unscoped package name, so `npx @uncoil.dev/sdk <command>` can pick it", () => {
    // With several bins, npx only runs the one named after the package without its scope.
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { name: string; bin: Record<string, string> };
    const unscoped = pkg.name.split("/").pop()!;
    expect(pkg.bin[unscoped]).toBe("dist/cli.js");
    expect(pkg.bin).toMatchObject({ uncoil: "dist/cli.js", "uncoil-doctor": "dist/cli.js" });
  });
});

describe("CLI command parsing", () => {
  it("treats --version and -v as the version command", () => {
    expect(parseCommand(["--version"])).toEqual({ command: "version", args: [] });
    expect(parseCommand(["-v"])).toEqual({ command: "version", args: [] });
  });

  it("reads the version from the package's own package.json", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(sdkVersion()).toBe(pkg.version);
  });

  it("rejects an unknown command instead of treating it as an option", () => {
    expect(parseCommand(["logn"])).toEqual({ error: 'Unknown command "logn". Use "login", "doctor" or "topics".' });
  });

  it("runs doctor with no arguments or only options", () => {
    expect(parseCommand([])).toEqual({ command: "doctor", args: [] });
    expect(parseCommand(["--json"])).toEqual({ command: "doctor", args: ["--json"] });
    expect(parseCommand(["login", "--json"])).toEqual({ command: "login", args: ["--json"] });
  });
});

describe("topics command", () => {
  const key = ["uncoil", "sk", "live", "eu", "abc123"].join("_");
  const payload = {
    projectId: "proj_1",
    map: { status: "ready", builtAt: "2026-01-02T03:04:05.000Z" },
    facets: {
      intent: [{ name: "Refund request", description: "Customers asking for money back", count: 12, share: 0.3, sampleRunIds: ["run_a", "run_b"] }],
    },
  };
  const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  afterEach(() => { vi.unstubAllGlobals(); });

  it("recognizes topics as a command", () => {
    expect(parseCommand(["topics", "--json"])).toEqual({ command: "topics", args: ["--json"] });
  });

  it("calls the endpoint with the key and prints counts, share and sample trace ids", async () => {
    const fetchMock = reply(200, payload);
    vi.stubGlobal("fetch", fetchMock);
    const result = await runTopics({ apiKey: key, host: "https://example.test/" });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://example.test/api/sdk/topics");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${key}` });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = formatTopics(result.data);
      expect(text).toContain("intent");
      expect(text).toContain("Refund request");
      expect(text).toContain("12");
      expect(text).toContain("30%");
      expect(text).toContain("run_a, run_b");
    }
  });

  it.each([
    [401, "rejected"],
    [404, "not available"],
  ])("explains an HTTP %i answer", async (status, word) => {
    vi.stubGlobal("fetch", reply(status, {}));
    const result = await runTopics({ apiKey: key, host: "https://example.test" });
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain(word);
  });

  it("asks for a key when none is set", async () => {
    const fetchMock = reply(200, payload);
    vi.stubGlobal("fetch", fetchMock);
    const saved = process.env.UNCOIL_API_KEY;
    const savedOld = process.env.TRACIFY_API_KEY;
    delete process.env.UNCOIL_API_KEY;
    delete process.env.TRACIFY_API_KEY;
    try {
      const result = await runTopics({});
      expect(!result.ok && result.message).toContain("API key");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.UNCOIL_API_KEY = saved;
      if (savedOld !== undefined) process.env.TRACIFY_API_KEY = savedOld;
    }
  });

  it("says when no topic map exists yet", async () => {
    vi.stubGlobal("fetch", reply(200, { projectId: "proj_1", map: null, facets: {} }));
    const result = await runTopics({ apiKey: key, host: "https://example.test" });
    expect(!result.ok && result.message).toContain("No topic map");
  });

  it("reports a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }); }));
    const result = await runTopics({ apiKey: key, host: "https://example.test" });
    expect(!result.ok && result.message).toContain("ECONNREFUSED");
  });
});
