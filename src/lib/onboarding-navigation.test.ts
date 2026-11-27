import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOneTimeApiKey, setOneTimeApiKey } from "@/lib/onboarding-client-state";
import { continueSetupHref, getOnboardingHref } from "./onboarding-navigation";

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
}

describe("continueSetupHref", () => {
  it("sends a project waiting for its first run straight to the install step", () => {
    expect(continueSetupHref("p1", "waiting")).toBe("/onboarding/install");
    expect(continueSetupHref("p1", "install")).toBe("/onboarding/install");
  });

  it("resumes the key step, falls back to the quickstart, and starts with a project when there is none", () => {
    expect(continueSetupHref("p1", "api-key")).toBe("/onboarding/api-key");
    expect(continueSetupHref("p1", "success")).toBe("/dashboard/p1/quickstart");
    expect(continueSetupHref("p1", null)).toBe("/dashboard/p1/quickstart");
    expect(continueSetupHref("", "waiting")).toBe("/onboarding/project");
  });
});

describe("getOnboardingHref", () => {
  let session: ReturnType<typeof createStorage>;
  let local: ReturnType<typeof createStorage>;

  beforeEach(() => {
    session = createStorage();
    local = createStorage();
    vi.stubGlobal("window", { sessionStorage: session, localStorage: local });
    clearOneTimeApiKey();
  });

  afterEach(() => {
    clearOneTimeApiKey();
    vi.unstubAllGlobals();
  });

  it("falls back to the project step when there is no window", () => {
    vi.stubGlobal("window", undefined);
    expect(getOnboardingHref("proj_1")).toBe("/onboarding/project");
  });

  it("returns the project step when no project is known", () => {
    expect(getOnboardingHref()).toBe("/onboarding/project");
  });

  it("returns the project step for the no-project sentinel", () => {
    expect(getOnboardingHref("no-project")).toBe("/onboarding/project");
  });

  it("returns the install step when a project exists and no key is pending", () => {
    expect(getOnboardingHref("proj_1")).toBe("/onboarding/install");
  });

  it("uses the project id stored in session storage", () => {
    session.setItem("uncoil.onboarding.projectId", "proj_session");
    expect(getOnboardingHref()).toBe("/onboarding/install");
  });

  it("prefers an explicit project id over the stored one", () => {
    session.setItem("uncoil.onboarding.projectId", "no-project");
    expect(getOnboardingHref("proj_1")).toBe("/onboarding/install");
  });

  it("sends the user to the api-key step while a one-time key is uncopied", () => {
    setOneTimeApiKey("uncoil_sk_live_test");
    expect(getOnboardingHref("proj_1")).toBe("/onboarding/api-key");
  });

  it("moves on to install once the key has been copied", () => {
    setOneTimeApiKey("uncoil_sk_live_test");
    session.setItem("uncoil.onboarding.apiKeyCopied", "true");
    expect(getOnboardingHref("proj_1")).toBe("/onboarding/install");
  });

  it("does not skip the project step just because a key is pending", () => {
    setOneTimeApiKey("uncoil_sk_live_test");
    expect(getOnboardingHref()).toBe("/onboarding/project");
  });

  it("falls back to the last project when no other project is known", () => {
    local.setItem("uncoil.lastProjectId", "proj_last");
    expect(getOnboardingHref()).toBe("/onboarding/install");
  });

  it("falls back to the last project when the session value is empty", () => {
    session.setItem("uncoil.onboarding.projectId", "");
    local.setItem("uncoil.lastProjectId", "proj_last");
    expect(getOnboardingHref("")).toBe("/onboarding/install");
  });

  it("prefers the session project over the last project", () => {
    session.setItem("uncoil.onboarding.projectId", "no-project");
    local.setItem("uncoil.lastProjectId", "proj_last");
    expect(getOnboardingHref()).toBe("/onboarding/project");
  });

  it("returns the project step when the last project is the sentinel", () => {
    local.setItem("uncoil.lastProjectId", "no-project");
    expect(getOnboardingHref()).toBe("/onboarding/project");
  });
});
