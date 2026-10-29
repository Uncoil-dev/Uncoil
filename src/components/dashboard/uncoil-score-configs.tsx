"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type ScoreConfig = { id: string; name: string; type: string; threshold: string };
const defaults: ScoreConfig[] = [{ id: "groundedness", name: "Groundedness", type: "numeric", threshold: "0.80" }, { id: "helpfulness", name: "Helpfulness", type: "numeric", threshold: "0.75" }];

export function UncoilScoreConfigs({ projectId }: { projectId: string }) {
  const storageKey = `uncoil.score-configs.${projectId}`;
  const [configs, setConfigs] = useState<ScoreConfig[]>(defaults);
  const [name, setName] = useState("");
  const [type, setType] = useState("numeric");
  const [threshold, setThreshold] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      // Hydrate browser-only score metadata after the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfigs(JSON.parse(stored) as ScoreConfig[]);
    } catch { window.localStorage.removeItem(storageKey); }
  }, [storageKey]);

  function save(next: ScoreConfig[]) { setConfigs(next); window.localStorage.setItem(storageKey, JSON.stringify(next)); }
  function addConfig() {
    if (!name.trim() || !threshold.trim()) { setNotice("Enter a score name and pass threshold."); return; }
    save([...configs, { id: `${name}-${Date.now()}`, name: name.trim(), type, threshold: threshold.trim() }]);
    setName(""); setThreshold(""); setNotice("Score configuration added.");
  }

  return <section className="uncoil-settings-resource"><div className="uncoil-settings-resource-heading"><div><span className="uncoil-eyebrow">PROJECT SETTINGS / EVALUATION</span><h1>Scores Configs</h1><p>Define the score signals and thresholds used by review and evaluation workflows.</p></div></div><div className="uncoil-score-form"><label>Score name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="groundedness" /></label><label>Data type<select value={type} onChange={(event) => setType(event.target.value)}><option value="numeric">Numeric</option><option value="boolean">Boolean</option><option value="categorical">Categorical</option></select></label><label>Pass threshold<input value={threshold} onChange={(event) => setThreshold(event.target.value)} inputMode="decimal" placeholder="0.80" /></label><button type="button" onClick={addConfig}><Plus /> Add score</button></div>{notice ? <p className="uncoil-dashboard-notice" role="status">{notice}</p> : null}<div className="uncoil-score-list"><div className="uncoil-score-list-head"><span>SCORE</span><span>TYPE</span><span>THRESHOLD</span><span /></div>{configs.map((config) => <article key={config.id}><strong>{config.name}</strong><span>{config.type}</span><span>{config.threshold}</span><button type="button" onClick={() => { save(configs.filter((item) => item.id !== config.id)); setNotice("Score configuration removed."); }} aria-label={`Remove ${config.name}`}><Trash2 /></button></article>)}</div></section>;
}
