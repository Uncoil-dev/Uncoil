import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consumeRateLimit = vi.fn();
const sendTransactionalEmail = vi.fn();

vi.mock("@/lib/redis-cache", () => ({ consumeRateLimit: (...args: unknown[]) => consumeRateLimit(...args) }));
vi.mock("@/lib/transactional-email", () => ({ sendTransactionalEmail: (...args: unknown[]) => sendTransactionalEmail(...args) }));

import { crashFingerprint, reportCrash, scrub } from "./crash-report";

describe("scrub", () => {
  it("redacts emails and key-like tokens", () => {
    const key = "uncoil_sk_live_" + "abcdef123456";
    const out = scrub(`user a.b@example.com used ${key} and Bearer ` + "tokentoken99");
    expect(out).toBe("user [email] used [key] and [key]");
  });

  it("leaves ordinary text alone", () => {
    expect(scrub("TypeError: x is undefined")).toBe("TypeError: x is undefined");
  });
});

describe("crashFingerprint", () => {
  const base = { source: "server" as const, message: "boom", stack: "Error: boom\n    at foo (a.js:1:1)\n    at bar" };

  it("is a stable 16 char hex string", () => {
    expect(crashFingerprint(base)).toMatch(/^[0-9a-f]{16}$/);
    expect(crashFingerprint(base)).toBe(crashFingerprint({ ...base }));
  });

  it("differs by source, message, or first frame", () => {
    const fp = crashFingerprint(base);
    expect(crashFingerprint({ ...base, source: "browser" })).not.toBe(fp);
    expect(crashFingerprint({ ...base, message: "other" })).not.toBe(fp);
    expect(crashFingerprint({ ...base, stack: "Error\n    at baz (b.js:2:2)" })).not.toBe(fp);
  });
});

describe("reportCrash", () => {
  beforeEach(() => {
    consumeRateLimit.mockReset().mockResolvedValue({ allowed: true });
    sendTransactionalEmail.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends a scrubbed, escaped email", async () => {
    const result = await reportCrash({ source: "browser", message: "fail for me@example.com <b>", route: "/x" });
    expect(result).toEqual({ emailed: true });
    const mail = sendTransactionalEmail.mock.calls[0][0];
    expect(mail.text).toContain("Where: browser /x");
    expect(mail.text).not.toContain("me@example.com");
    expect(mail.html).toContain("&lt;b>");
    expect(mail.subject).toContain("Uncoil crash:");
  });

  it("skips duplicates", async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false });
    expect(await reportCrash({ source: "server", message: "x" })).toEqual({ emailed: false, reason: "duplicate" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("throttles when the global limit is hit", async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false });
    expect(await reportCrash({ source: "server", message: "x" })).toEqual({ emailed: false, reason: "throttled" });
  });

  it("reports an error result when sending fails", async () => {
    sendTransactionalEmail.mockRejectedValueOnce(new Error("down"));
    expect(await reportCrash({ source: "server", message: "x" })).toEqual({ emailed: false, reason: "error" });
  });
});
