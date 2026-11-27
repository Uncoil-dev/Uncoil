import { describe, expect, it } from "vitest";

import { buildAgentPrompt } from "./quickstart-agent-prompt";

describe("buildAgentPrompt", () => {
  it("walks the agent through login, init and the setup check for TypeScript", () => {
    const prompt = buildAgentPrompt({ lang: "typescript", region: "eu" });
    expect(prompt).toContain("npm install @uncoil.dev/sdk");
    expect(prompt).toContain("npx @uncoil.dev/sdk login");
    expect(prompt).not.toContain("--region us");
    expect(prompt).toContain('import { init } from "@uncoil.dev/sdk"');
    expect(prompt).toContain("npx @uncoil.dev/sdk doctor");
  });

  it("uses the Python package, init and doctor for Python", () => {
    const prompt = buildAgentPrompt({ lang: "python", region: "eu" });
    expect(prompt).toContain("pip install uncoil-sdk");
    expect(prompt).toContain("uncoil.init()");
    expect(prompt).toContain("uncoil-doctor");
    // The Python setup check has no "Traces will land in" line, so the agent must not wait for one.
    expect(prompt).not.toContain("Traces will land in");
  });

  it("signs in to the US region when the dashboard runs there", () => {
    expect(buildAgentPrompt({ lang: "typescript", region: "us" })).toContain("npx @uncoil.dev/sdk login --region us");
  });

  it("keeps the steps in the documented order", () => {
    const prompt = buildAgentPrompt({ lang: "typescript", region: "eu" });
    const order = ["Look at the project", "Install", "login", "init()", "doctor", "Run the agent once"].map((s) => prompt.indexOf(s));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
