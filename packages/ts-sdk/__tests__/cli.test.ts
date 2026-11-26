import { describe, expect, it } from "vitest";
import { parseCommand, sdkVersion } from "../src/cli";

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
    expect(parseCommand(["logn"])).toEqual({ error: 'Unknown command "logn". Use "login" or "doctor".' });
  });

  it("runs doctor with no arguments or only options", () => {
    expect(parseCommand([])).toEqual({ command: "doctor", args: [] });
    expect(parseCommand(["--json"])).toEqual({ command: "doctor", args: ["--json"] });
    expect(parseCommand(["login", "--json"])).toEqual({ command: "login", args: ["--json"] });
  });
});
