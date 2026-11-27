import { describe, it, expect, afterEach, vi } from "vitest";
import { UncoilClient, UncoilError } from "../src/index";

const respond = (status: number, body: Record<string, unknown>) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

const failure = (client: UncoilClient) => client.getPrompt("support-agent", "production").catch((error: unknown) => error);

describe("getPrompt errors", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("asks for an API key when none is set", async () => {
    const saved = process.env.UNCOIL_API_KEY;
    delete process.env.UNCOIL_API_KEY;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const error = await failure(new UncoilClient());
      expect(error).toBeInstanceOf(UncoilError);
      expect(error).toMatchObject({ code: "missing_key" });
      expect((error as Error).message).toContain("UNCOIL_API_KEY");
    } finally {
      if (saved !== undefined) process.env.UNCOIL_API_KEY = saved;
    }
  });

  it("explains a rejected key", async () => {
    respond(401, { error: "Bearer API key required" });
    const error = await failure(new UncoilClient({ apiKey: "uncoil_sk_live_eu_test" }));
    expect(error).toMatchObject({ code: "bad_key", status: 401 });
    expect((error as Error).message).toContain("UNCOIL_API_KEY");
  });

  it("points to the Prompts page when the prompt or label is missing", async () => {
    respond(404, { error: "Prompt or deployed environment not found" });
    const error = await failure(new UncoilClient({ apiKey: "uncoil_sk_live_eu_test" }));
    expect(error).toMatchObject({ code: "prompt_not_found", status: 404 });
    expect((error as Error).message).toContain('"support-agent"');
    expect((error as Error).message).toContain('"production"');
    expect((error as Error).message).toContain("Prompts page");
  });

  it("keeps the server's reason for other failures", async () => {
    respond(503, { error: "Prompt resolution unavailable" });
    const error = await failure(new UncoilClient({ apiKey: "uncoil_sk_live_eu_test" }));
    expect(error).toMatchObject({ code: "prompt_failed", status: 503 });
    expect((error as Error).message).toContain("Prompt resolution unavailable");
  });
});
