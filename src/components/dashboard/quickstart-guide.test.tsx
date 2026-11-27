import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { keyEnvLines } from "@/lib/quickstart-env";
import { KeyStep, quickstartSteps } from "./quickstart-guide";

const env = keyEnvLines("uncoil_sk_live_eu_••••••••abcd", "eu");

describe("quickstart key step", () => {
  it("puts the key step before the prompt in coding agent setup", () => {
    expect(quickstartSteps("agent")).toEqual(["method", "key", "prompt", "verify"]);
  });

  it("offers to copy the key while the one-time key is still available", () => {
    const html = renderToStaticMarkup(createElement(KeyStep, { projectId: "p1", shown: env, copyEnv: env, hasKey: true, done: null, onCopy: () => {} }));
    expect(html).toContain("Copy");
    expect(html).not.toContain("/api-keys");
  });

  it("links to a new key for the current project when the one-time key is gone", () => {
    const html = renderToStaticMarkup(createElement(KeyStep, { projectId: "p1", shown: env, copyEnv: env, hasKey: false, done: null, onCopy: () => {} }));
    expect(html).toContain('href="/dashboard/p1/api-keys"');
    expect(html).toContain("Create a key");
    expect(html).not.toContain("<button");
  });
});
