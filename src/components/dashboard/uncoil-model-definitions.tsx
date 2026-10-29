"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type ModelDefinition = { id: string; provider: string; model: string; input: string; output: string };
const defaults: ModelDefinition[] = [{ id: "gpt-5", provider: "OpenAI", model: "gpt-5", input: "1.25", output: "10.00" }, { id: "claude-sonnet", provider: "Anthropic", model: "claude-sonnet", input: "3.00", output: "15.00" }];

export function UncoilModelDefinitions({ projectId }: { projectId: string }) {
  const storageKey = `uncoil.model-definitions.${projectId}`;
  const [models, setModels] = useState<ModelDefinition[]>(defaults);
  const [provider, setProvider] = useState("OpenAI");
  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      // Hydrate browser-only model metadata after the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModels(JSON.parse(stored) as ModelDefinition[]);
    } catch { window.localStorage.removeItem(storageKey); }
  }, [storageKey]);

  function save(next: ModelDefinition[]) { setModels(next); window.localStorage.setItem(storageKey, JSON.stringify(next)); }
  function addModel() {
    if (!model.trim() || !input.trim() || !output.trim()) { setNotice("Enter a model and both token prices."); return; }
    save([...models, { id: `${provider}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), provider, model: model.trim(), input: input.trim(), output: output.trim() }]);
    setModel(""); setInput(""); setOutput(""); setNotice("Model definition added.");
  }
  return <section className="uncoil-settings-resource"><div className="uncoil-settings-resource-heading"><div><span className="uncoil-eyebrow">PROJECT SETTINGS / PRICING</span><h1>Model Definitions</h1><p>Define model names and token pricing used by cost and evaluation views.</p></div></div><div className="uncoil-model-form"><label>Provider<select value={provider} onChange={(event) => setProvider(event.target.value)}><option>OpenAI</option><option>Anthropic</option><option>Google</option><option>Custom</option></select></label><label>Model name<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-5-mini" /></label><label>Input / 1M tokens<input value={input} onChange={(event) => setInput(event.target.value)} inputMode="decimal" placeholder="0.25" /></label><label>Output / 1M tokens<input value={output} onChange={(event) => setOutput(event.target.value)} inputMode="decimal" placeholder="2.00" /></label><button type="button" onClick={addModel}><Plus /> Add model</button></div>{notice ? <p className="uncoil-dashboard-notice" role="status">{notice}</p> : null}<div className="uncoil-model-list"><div className="uncoil-model-list-head"><span>MODEL</span><span>INPUT / 1M</span><span>OUTPUT / 1M</span><span /></div>{models.map((definition) => <article key={definition.id}><div><strong>{definition.model}</strong><small>{definition.provider}</small></div><span>${definition.input}</span><span>${definition.output}</span><button type="button" onClick={() => { save(models.filter((item) => item.id !== definition.id)); setNotice("Model definition removed."); }} aria-label={`Remove ${definition.model}`}><Trash2 /></button></article>)}</div></section>;
}
