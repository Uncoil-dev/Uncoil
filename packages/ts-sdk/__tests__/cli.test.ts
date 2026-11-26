import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli";

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
  it("rejects an unknown command instead of treating it as an option", () => {
    expect(parseCommand(["logn"])).toEqual({ error: 'Unknown command "logn". Use "login" or "doctor".' });
  });

  it("runs doctor with no arguments or only options", () => {
    expect(parseCommand([])).toEqual({ command: "doctor", args: [] });
    expect(parseCommand(["--json"])).toEqual({ command: "doctor", args: ["--json"] });
    expect(parseCommand(["login", "--json"])).toEqual({ command: "login", args: ["--json"] });
  });
});
