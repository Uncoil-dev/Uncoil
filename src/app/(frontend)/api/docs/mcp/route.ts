import { NextResponse } from "next/server";
import { getDocMarkdown, getPublicDocs } from "@/lib/markdoc-docs";
import { searchDocs } from "@/lib/docs-search";

export const runtime = "nodejs";

const protocolVersion = "2025-03-26";
const resourceUri = (slug: string) => `uncoil://docs/${slug}`;

function result(id: unknown, value: unknown) { return NextResponse.json({ jsonrpc: "2.0", id, result: value }); }
function error(id: unknown, code: number, message: string) { return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }); }
function docMarkdown(slug: string) { return getDocMarkdown(slug); }

export async function GET() { return NextResponse.json({ name: "Uncoil Docs MCP", transport: "streamable-http", endpoint: "/api/docs/mcp", install: { mcpServers: { "uncoil-docs": { url: "https://www.uncoil.dev/api/docs/mcp" } } } }); }

export async function POST(request: Request) {
  const message = await request.json().catch(() => null) as { id?: unknown; method?: string; params?: Record<string, unknown> } | null;
  if (!message?.method) return error(message?.id ?? null, -32600, "Invalid JSON-RPC request");
  const id = message.id;
  const docs = getPublicDocs();
  let response: unknown;
  switch (message.method) {
    case "initialize": response = { protocolVersion, capabilities: { resources: {}, tools: {} }, serverInfo: { name: "uncoil-docs", version: "1.0.0" } }; break;
    case "notifications/initialized": return new NextResponse(null, { status: 204 });
    case "resources/list": response = { resources: docs.map((doc) => ({ uri: resourceUri(doc.slug), name: doc.title, description: doc.description, mimeType: "text/markdown" })) }; break;
    case "resources/read": { const uri = String(message.params?.uri ?? ""); if (!uri.startsWith("uncoil://docs/") || uri.includes("..")) return error(id, -32602, "Invalid documentation resource"); const slug = uri.slice("uncoil://docs/".length); const markdown = docMarkdown(slug); if (!markdown) return error(id, -32602, "Unknown documentation resource"); response = { contents: [{ uri, mimeType: "text/markdown", text: markdown }] }; break; }
    case "tools/list": response = { tools: [{ name: "list_docs", description: "List all public Uncoil documentation pages.", inputSchema: { type: "object", properties: {} } }, { name: "search_docs", description: "Search Uncoil docs by title, headings, description, and body content.", inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 200 }, limit: { type: "number", minimum: 1, maximum: 10 } }, required: ["query"] } }, { name: "read_doc", description: "Read a full Uncoil documentation page as Markdown.", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } }] }; break;
    case "tools/call": { const name = String(message.params?.name ?? ""); const args = message.params?.arguments as Record<string, unknown> | undefined; if (name === "list_docs") response = { content: [{ type: "text", text: docs.map((doc) => `- ${doc.title}: ${doc.slug} — ${doc.description} (${doc.canonicalUrl})`).join("\n") }] }; else if (name === "search_docs") { const query = String(args?.query ?? ""); if (query.length > 200) return error(id, -32602, "Search query is too long"); const limit = Math.min(10, Math.max(1, Number(args?.limit) || 5)); const matches = searchDocs(docs, query, limit); response = { content: [{ type: "text", text: matches.map((doc) => `- ${doc.title}: ${doc.slug} — ${doc.excerpt} (${doc.section})`).join("\n") || "No matching docs found." }] }; } else if (name === "read_doc") { const markdown = docMarkdown(String(args?.slug ?? "")); if (!markdown) return error(id, -32602, "Unknown documentation slug"); response = { content: [{ type: "text", text: markdown }] }; } else return error(id, -32601, "Unknown tool"); break; }
    default: return error(id, -32601, "Method not found");
  }
  return id === undefined ? new NextResponse(null, { status: 204 }) : result(id, response);
}
