import { describe, expect, it } from "vitest";
import { docsSections } from "./docs-viewer";

describe("docsSections", () => {
  it("links the quickstart to the project's tracing page and includes the key step", () => {
    const quickstart = docsSections("p1").quickstart.content;
    expect(quickstart).toContain("(/dashboard/p1/tracing)");
    expect(quickstart).not.toContain("(/dashboard/runs)");
    expect(quickstart).toContain("UNCOIL_API_KEY");
  });

  it("documents llm_call and tool_call as functions with the SDK's argument names", () => {
    const python = docsSections("p1").sdk_python.content;
    expect(python).not.toContain("@llm_call");
    expect(python).not.toContain("@tool_call");
    expect(python).toContain("model_id=");
    expect(python).toContain("tool_name=");
    expect(python).not.toMatch(/`metadata`: \(Optional\) Dict/);
  });

  it("does not point to a settings section that does not exist", () => {
    expect(docsSections("p1").observability.content).not.toContain("Privacy & Retention");
  });
});
