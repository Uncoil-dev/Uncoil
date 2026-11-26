import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli";

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
