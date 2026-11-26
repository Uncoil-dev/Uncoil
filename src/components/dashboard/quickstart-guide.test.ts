import { describe, expect, it } from "vitest";
import { SNIPPETS } from "./quickstart-guide";

describe("quickstart instrument snippets", () => {
  it("turns on tracing in Python with uncoil.init() and no sample model data", () => {
    const code = SNIPPETS.python.code;
    expect(code).toMatch(/^import uncoil$/m);
    expect(code).toMatch(/^uncoil\.init\(\)/m);
    expect(code).not.toContain("What is Uncoil?");
  });

  it("turns on tracing in TypeScript with init() and no sample model data", () => {
    const code = SNIPPETS.typescript.code;
    expect(code).toContain('import { init } from "@uncoil.dev/sdk";');
    expect(code).toMatch(/^const tracing = init\(\);/m);
    expect(code).toContain("await tracing.ready;");
    expect(code).toMatch(/^main\(\);/m);
    expect(code).not.toContain("What is Uncoil?");
  });
});
