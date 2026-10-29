"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

const snippets = {
  cli: `uncoil projects list\nuncoil traces list --project <PROJECT_ID>`,
  mcp: `{"mcpServers":{"uncoil":{"url":"https://api.uncoil.dev/mcp","headers":{"Authorization":"Bearer <UNCOIL_API_KEY>"}}}}`,
  curl: `curl -H "Authorization: Bearer <UNCOIL_API_KEY>" \\\n+  https://api.uncoil.dev/v1/projects/<PROJECT_ID>/traces`,
};

export function UncoilMcpCli({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<keyof typeof snippets>("cli");
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(snippets[tab].replace("<PROJECT_ID>", projectId)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <section className="uncoil-settings-resource"><div className="uncoil-settings-resource-heading"><div><span className="uncoil-eyebrow">PROJECT SETTINGS / DEVELOPER ACCESS</span><h1>MCP &amp; CLI</h1><p>Connect agents and developer tools to this Uncoil project.</p></div><Terminal /></div><div className="uncoil-mcp-tabs">{(["cli", "mcp", "curl"] as const).map((item) => <button type="button" key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "cli" ? "Uncoil CLI" : item === "mcp" ? "MCP server" : "REST API"}</button>)}</div><div className="uncoil-mcp-code"><button type="button" onClick={() => void copy()} aria-label="Copy configuration">{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</button><pre><code>{snippets[tab].replace("<PROJECT_ID>", projectId)}</code></pre></div><div className="uncoil-mcp-note">Use a project API key for authenticated access. Keys are shown once when created and should be stored in your secret manager.</div></section>;
}
