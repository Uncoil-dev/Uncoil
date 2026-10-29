"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";

type Connection = { id: string; provider: string; adapter: string; baseUrl: string; createdAt: string };

export function UncoilLlmConnections({ projectId }: { projectId: string }) {
  const storageKey = `uncoil.llm-connections.${projectId}`;
  const [connections, setConnections] = useState<Connection[]>([]);
  const [provider, setProvider] = useState("OpenAI");
  const [adapter, setAdapter] = useState("OpenAI-compatible");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      // Hydrate the browser-only settings after the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnections(JSON.parse(stored) as Connection[]);
    } catch { window.localStorage.removeItem(storageKey); }
  }, [storageKey]);

  function addConnection() {
    if (!apiKey.trim() || !baseUrl.trim()) { setNotice("Enter a base URL and API key before adding a connection."); return; }
    const next = [...connections, { id: crypto.randomUUID(), provider, adapter, baseUrl: baseUrl.trim(), createdAt: new Date().toISOString() }];
    setConnections(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setApiKey("");
    setNotice("Connection added. The secret is never stored in the browser.");
  }

  function removeConnection(id: string) {
    const next = connections.filter((connection) => connection.id !== id);
    setConnections(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setNotice("Connection removed.");
  }

  return <section className="uncoil-settings-resource"><div className="uncoil-settings-resource-heading"><div><span className="uncoil-eyebrow">PROJECT SETTINGS / PROVIDERS</span><h1>LLM Connections</h1><p>Connect model providers used by your Uncoil evaluations and playground.</p></div><KeyRound /></div><div className="uncoil-connection-form"><label>Provider<select value={provider} onChange={(event) => setProvider(event.target.value)}><option>OpenAI</option><option>Anthropic</option><option>Google</option><option>Custom</option></select></label><label>Adapter<select value={adapter} onChange={(event) => setAdapter(event.target.value)}><option>OpenAI-compatible</option><option>Anthropic Messages</option><option>Vertex AI</option></select></label><label className="uncoil-connection-wide">Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" /></label><label className="uncoil-connection-wide">API key<input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder="sk-…" autoComplete="off" /></label><button type="button" onClick={addConnection}><Plus /> Add connection</button></div>{notice ? <p className="uncoil-dashboard-notice" role="status">{notice}</p> : null}<div className="uncoil-connections-list">{connections.map((connection) => <article key={connection.id}><div><strong>{connection.provider}</strong><small>{connection.adapter} · {connection.baseUrl}</small></div><span>••••••••</span><button type="button" onClick={() => removeConnection(connection.id)} aria-label={`Remove ${connection.provider} connection`}><Trash2 /></button></article>)}{connections.length === 0 ? <div className="uncoil-empty-workspace">No LLM connections configured.</div> : null}</div></section>;
}
