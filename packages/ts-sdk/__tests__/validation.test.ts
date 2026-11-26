import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { UncoilClient, UncoilError, buildRedactor, sampleBucket } from "../src/index";

const make = (config: Record<string, unknown> = {}) => new UncoilClient({ apiKey: "test-key", onError: () => {}, ...config });
const sampledOut = (client: UncoilClient, runId: string, data: Record<string, unknown> = {}) =>
  (client as unknown as { sampledOut(id: string, d: Record<string, unknown>): boolean }).sampledOut(runId, data);

describe("client config validation", () => {
  it.each([-0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects sampleRate %s", (rate) => {
    try {
      make({ sampleRate: rate });
      expect.unreachable("constructor should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(UncoilError);
      expect((error as UncoilError).code).toBe("bad_sample_rate");
      expect((error as UncoilError).hint).toBeTruthy();
    }
  });

  it.each([0, 0.5, 1])("accepts sampleRate %s", (rate) => {
    expect(() => make({ sampleRate: rate })).not.toThrow();
  });

  it("rejects an invalid host", () => {
    expect(() => make({ host: "not a url" })).toThrowError(expect.objectContaining({ code: "bad_host" }));
  });

  it("reports a missing key once through onError", () => {
    const seen: string[] = [];
    const saved = process.env.UNCOIL_API_KEY;
    const savedLegacy = process.env.TRACIFY_API_KEY;
    delete process.env.UNCOIL_API_KEY;
    delete process.env.TRACIFY_API_KEY;
    try {
      new UncoilClient({ onError: (e) => seen.push(e.code) });
    } finally {
      if (saved !== undefined) process.env.UNCOIL_API_KEY = saved;
      if (savedLegacy !== undefined) process.env.TRACIFY_API_KEY = savedLegacy;
    }
    expect(seen).toEqual(["missing_key"]);
  });

  function missingKeyMessage(envLocal?: string) {
    const dir = mkdtempSync(join(tmpdir(), "uncoil-env-"));
    if (envLocal !== undefined) writeFileSync(join(dir, ".env.local"), envLocal);
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir);
    const saved = process.env.UNCOIL_API_KEY;
    delete process.env.UNCOIL_API_KEY;
    const seen: UncoilError[] = [];
    try {
      new UncoilClient({ onError: (e) => seen.push(e) });
    } finally {
      cwd.mockRestore();
      rmSync(dir, { recursive: true, force: true });
      if (saved !== undefined) process.env.UNCOIL_API_KEY = saved;
    }
    return seen[0];
  }

  it("names .env.local when that file sets the key but the app did not load it", () => {
    const error = missingKeyMessage("UNCOIL_PROJECT_ID=p1\nUNCOIL_API_KEY=uncoil_sk_live_eu_abc\n");
    expect(error.code).toBe("missing_key");
    expect(error.message).toContain(".env.local");
    expect(error.message).toContain("node --env-file=.env.local");
  });

  it("keeps the plain missing-key message when .env.local does not set the key", () => {
    const plain = missingKeyMessage().message;
    expect(plain).not.toContain(".env.local");
    expect(missingKeyMessage("OTHER=1\n").message).toBe(plain);
  });

  it("reports an unrecognised key format", () => {
    const onError = vi.fn();
    new UncoilClient({ apiKey: "not-a-real-key", onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "odd_key" }));
  });

  it("does not let a throwing onError handler break construction", () => {
    expect(() => new UncoilClient({ apiKey: "bad", onError: () => { throw new Error("boom"); } })).not.toThrow();
  });
});

describe("sampling", () => {
  it("gives each run id a stable bucket in [0, 1)", () => {
    for (const id of ["a", "run-1", "run-2", ""]) {
      const bucket = sampleBucket(id);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(1);
      expect(sampleBucket(id)).toBe(bucket);
    }
  });

  it("keeps everything at rate 1 and drops everything at rate 0", () => {
    expect(sampledOut(make({ sampleRate: 1 }), "run-1")).toBe(false);
    expect(sampledOut(make({ sampleRate: 0 }), "run-1")).toBe(true);
  });

  it("makes one decision per run", () => {
    const client = make({ sampleRate: 0.5 });
    for (let i = 0; i < 20; i++) {
      const id = `run-${i}`;
      expect(sampledOut(client, id)).toBe(sampledOut(client, id));
    }
  });

  it("keeps roughly the requested share of runs", () => {
    const client = make({ sampleRate: 0.3 });
    let kept = 0;
    for (let i = 0; i < 2000; i++) if (!sampledOut(client, `run-${i}`)) kept++;
    expect(kept / 2000).toBeGreaterThan(0.2);
    expect(kept / 2000).toBeLessThan(0.4);
  });

  it("keeps error spans by default, even at rate 0", () => {
    const client = make({ sampleRate: 0 });
    expect(sampledOut(client, "run-1", { errorType: "Error" })).toBe(false);
    expect(sampledOut(client, "run-1", { errorMessage: "failed" })).toBe(false);
  });

  it("drops error spans when keepErrors is false", () => {
    const client = make({ sampleRate: 0, keepErrors: false });
    expect(sampledOut(client, "run-1", { errorType: "Error" })).toBe(true);
  });
});

describe("buildRedactor", () => {
  it("masks emails, phone numbers and valid card numbers by default", () => {
    const redact = buildRedactor()!;
    expect(redact("mail jane@example.com now")).toBe("mail [redacted] now");
    expect(redact("call +44 20 7946 0958 today")).toContain("[redacted]");
    expect(redact("card 4111 1111 1111 1111.")).toBe("card [redacted].");
  });

  it("leaves long numbers that fail the card check alone", () => {
    expect(buildRedactor()!("id 1234567890123456")).toBe("id 1234567890123456");
  });

  it("returns undefined when nothing is configured to mask", () => {
    expect(buildRedactor({ pii: false })).toBeUndefined();
  });

  it("masks extra string and regex patterns with a custom replacement", () => {
    const redact = buildRedactor({ pii: false, patterns: ["a.b", /secret-\d+/], replacement: "***" })!;
    expect(redact("a.b and axb and secret-42 and secret-7")).toBe("*** and axb and *** and ***");
  });

  it("runs a custom fn last", () => {
    const redact = buildRedactor({ pii: false, patterns: ["x"], fn: (t) => t.toUpperCase() })!;
    expect(redact("x y")).toBe("[REDACTED] Y");
  });

  it("ignores an empty string pattern", () => {
    expect(buildRedactor({ pii: false, patterns: [""] })).toBeUndefined();
  });
});
