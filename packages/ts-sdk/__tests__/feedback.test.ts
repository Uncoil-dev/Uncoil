import { afterEach, describe, expect, it, vi } from "vitest";
import { UncoilClient } from "../src/index";

const KEY = "uncoil_sk_live_eu_abcdefghijklmnop";
const HOST = "https://feedback.example.test";

type Request = { url: string; body: Record<string, unknown> };

function mockFetch() {
  const requests: Request[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return new Response("{}", { status: 200 });
  }));
  return requests;
}

const client = () => new UncoilClient({ apiKey: KEY, host: HOST, projectId: "proj_1" });
const flush = () => new Promise((resolve) => setTimeout(resolve, 5));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("feedback", () => {
  it("infers the kind from the value type", () => {
    const requests = mockFetch();
    const uncoil = client();
    uncoil.feedback("trace-1", 4);
    uncoil.feedback("trace-1", true);
    uncoil.feedback("trace-1", "Too slow");
    expect(requests.map((r) => r.body.kind)).toEqual(["star", "thumb", "text"]);
    expect(requests[0]).toMatchObject({ url: `${HOST}/api/feedback`, body: { projectId: "proj_1", traceId: "trace-1", value: 4 } });
  });

  it("lets an explicit kind win over the inferred one", () => {
    const requests = mockFetch();
    client().feedback("trace-1", 1, { kind: "thumb", spanId: "span-1", reason: "helpful" });
    expect(requests[0].body).toMatchObject({ kind: "thumb", value: 1, spanId: "span-1", reason: "helpful" });
  });

  it("sends nothing without a project id", () => {
    const requests = mockFetch();
    const uncoil = new UncoilClient({ apiKey: KEY, host: HOST });
    uncoil.feedback("trace-1", true);
    uncoil.score("trace-1", "accuracy", 0.9);
    expect(requests).toHaveLength(0);
    uncoil.feedback("trace-1", true, { projectId: "proj_2" });
    expect(requests[0].body.projectId).toBe("proj_2");
  });

  it("logs a warning and does not throw when the request is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => client().feedback("trace-1", true)).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to record feedback"), expect.any(Error));
  });
});

describe("score", () => {
  it("sends a text-kind record with the name, value and data type", () => {
    const requests = mockFetch();
    client().score("trace-1", "accuracy", 0.9, { dataType: "numeric", spanId: "span-1", comment: "close" });
    expect(requests[0]).toMatchObject({
      url: `${HOST}/api/feedback`,
      body: { projectId: "proj_1", traceId: "trace-1", kind: "text", name: "accuracy", value: 0.9, dataType: "numeric", spanId: "span-1", comment: "close" },
    });
  });

  it("logs a warning and does not throw when the request is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => client().score("trace-1", "accuracy", 1)).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to record score"), expect.any(Error));
  });
});
