import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/markdoc-docs", () => ({ getPublicDocs: () => [], getDocMarkdown: () => null }));

const { POST } = await import("./route");

async function post(body: string) {
  const response = await POST(new Request("http://localhost/api/docs/mcp", { method: "POST", headers: { "content-type": "application/json" }, body }));
  return { status: response.status, json: await response.json() };
}

describe("docs MCP server errors", () => {
  it("returns a parse error for a body that is not JSON", async () => {
    const { status, json } = await post("{not json");
    expect(status).toBe(200);
    expect(json).toEqual({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  });

  it("returns an invalid request error for JSON with no method", async () => {
    const { json } = await post(JSON.stringify({ jsonrpc: "2.0", id: 7 }));
    expect(json.error).toEqual({ code: -32600, message: "Invalid JSON-RPC request" });
    expect(json.id).toBe(7);
  });

  it("lists the available tools when the tool is unknown", async () => {
    const { json } = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "delete_docs" } }));
    expect(json.error.code).toBe(-32601);
    expect(json.error.message).toBe("Unknown tool. Available tools: list_docs, search_docs, read_doc");
  });
});
