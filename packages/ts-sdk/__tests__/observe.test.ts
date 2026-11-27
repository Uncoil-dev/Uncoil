import { describe, it, expect, afterEach, vi } from "vitest";
import { UncoilClient, observe } from "../src/index";

afterEach(() => { vi.unstubAllGlobals(); });

/** A real client whose POSTs are captured instead of sent. */
function recordingClient() {
  const sent: Array<Record<string, unknown>> = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return new Response("{}"); });
  return { client: new UncoilClient({ apiKey: "uncoil_sk_live_eu_test" }), sent };
}

describe("observe", () => {
  it("names the step from options.name before the function name", async () => {
    const { client, sent } = recordingClient();
    await observe(function fetchDoc() { return 1; }, { name: "load", client })();
    expect(sent[0]?.toolName).toBe("load");
  });

  it("names the step after the function when no name is given", async () => {
    const { client, sent } = recordingClient();
    await observe(function fetchDoc() { return 1; }, { client })();
    expect(sent[0]?.toolName).toBe("fetchDoc");
  });

  it("falls back to step for an anonymous function", async () => {
    const { client, sent } = recordingClient();
    await observe(() => 1, { client })();
    expect(sent[0]?.toolName).toBe("step");
  });

  it("records the arguments as input", async () => {
    const { client, sent } = recordingClient();
    await observe((url: string, page: number) => `${url}#${page}`, { client })("a", 2);
    expect(sent[0]).toMatchObject({ input: '["a",2]', output: "a#2" });
  });

  it("records no input when captureInput is false", async () => {
    const { client, sent } = recordingClient();
    await observe((password: string) => password.length, { client, captureInput: false })("hunter2");
    expect(sent[0]?.input).toBe("");
    expect(sent[0]?.output).toBe("7");
  });

  it("records a thrown error and rethrows it", async () => {
    const { client, sent } = recordingClient();
    const error = new RangeError("too far");
    const wrapped = observe(async function move() { throw error; }, { client });
    await expect(wrapped()).rejects.toBe(error);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ toolName: "move", errorType: "RangeError", errorMessage: "too far" });
  });
});
