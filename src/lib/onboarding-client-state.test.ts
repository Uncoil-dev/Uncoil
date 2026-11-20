import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOneTimeApiKey,
  clearReturnPath,
  dismissOnboarding,
  getOneTimeApiKey,
  getReturnPath,
  hasDismissedOnboarding,
  hasOneTimeApiKey,
  setOneTimeApiKey,
  setReturnPath,
  subscribeToOneTimeApiKey,
} from "./onboarding-client-state";

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
}

const fakeKey = ["fake", "one", "time", "value"].join("-");

describe("onboarding client state", () => {
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

  describe("one-time key", () => {
    it("stores and returns the value", () => {
      expect(hasOneTimeApiKey()).toBe(false);
      setOneTimeApiKey(fakeKey);
      expect(getOneTimeApiKey()).toBe(fakeKey);
      expect(hasOneTimeApiKey()).toBe(true);
    });

    it("restores the value from session storage after memory is cleared", () => {
      setOneTimeApiKey(fakeKey);
      const stored = session.getItem("uncoil.onboarding.apiKey");
      // Simulate a reload: memory empty, storage intact.
      clearOneTimeApiKey();
      session.setItem("uncoil.onboarding.apiKey", stored ?? "");
      expect(hasOneTimeApiKey()).toBe(true);
      expect(getOneTimeApiKey()).toBe(fakeKey);
    });

    it("clears memory and storage", () => {
      setOneTimeApiKey(fakeKey);
      clearOneTimeApiKey();
      expect(getOneTimeApiKey()).toBe("");
      expect(hasOneTimeApiKey()).toBe(false);
      expect(session.getItem("uncoil.onboarding.apiKey")).toBeNull();
    });

    it("works in memory only when window is unavailable", () => {
      vi.stubGlobal("window", undefined);
      setOneTimeApiKey(fakeKey);
      expect(getOneTimeApiKey()).toBe(fakeKey);
      expect(hasOneTimeApiKey()).toBe(true);
      clearOneTimeApiKey();
      expect(hasOneTimeApiKey()).toBe(false);
    });
  });

  describe("subscriptions", () => {
    it("notifies on set and clear, and stops after unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOneTimeApiKey(listener);
      setOneTimeApiKey(fakeKey);
      clearOneTimeApiKey();
      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
      setOneTimeApiKey(fakeKey);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("notifies on return path and dismissal changes", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToOneTimeApiKey(listener);
      setReturnPath("/dashboard/abc");
      clearReturnPath();
      dismissOnboarding();
      expect(listener).toHaveBeenCalledTimes(3);
      unsubscribe();
    });
  });

  describe("return path", () => {
    it("is empty by default", () => {
      expect(getReturnPath()).toBe("");
    });

    it("round-trips a path and clears it", () => {
      setReturnPath("/dashboard/abc/runs");
      expect(getReturnPath()).toBe("/dashboard/abc/runs");
      clearReturnPath();
      expect(getReturnPath()).toBe("");
    });

    it("normalizes the no-project dashboard path", () => {
      setReturnPath("/dashboard/no-project");
      expect(getReturnPath()).toBe("/dashboard");
    });

    it("is a no-op without window", () => {
      vi.stubGlobal("window", undefined);
      const listener = vi.fn();
      const unsubscribe = subscribeToOneTimeApiKey(listener);
      setReturnPath("/dashboard/abc");
      clearReturnPath();
      expect(getReturnPath()).toBe("");
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe("dismissal", () => {
    it("defaults to not dismissed and persists once dismissed", () => {
      expect(hasDismissedOnboarding()).toBe(false);
      dismissOnboarding();
      expect(hasDismissedOnboarding()).toBe(true);
      expect(local.getItem("uncoil.onboarding.dismissed")).toBe("true");
    });

    it("only treats the exact value true as dismissed", () => {
      local.setItem("uncoil.onboarding.dismissed", "yes");
      expect(hasDismissedOnboarding()).toBe(false);
    });

    it("returns false without window", () => {
      vi.stubGlobal("window", undefined);
      expect(hasDismissedOnboarding()).toBe(false);
    });
  });
});
