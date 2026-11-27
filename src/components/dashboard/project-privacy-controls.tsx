"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DEFAULT_REDACTION_RULES } from "@/lib/redaction";
import { effectiveRetentionDays, planRetentionDays } from "@/lib/retention";
import { validatePrivacySettings } from "@/features/dashboard-workspace/settings-tabs";

const field =
  "w-full border border-[#262C35] bg-[#0B0D10] px-3 py-2 font-mono text-[12px] text-[#E6E9EE] outline-none focus:border-[#F4D44D]";

type PrivacyProject = {
  planTier?: string;
  redactionEnabled?: boolean;
  redactionRules?: string[];
  retentionDays?: number;
};

/** Redaction switch, per-rule toggles and retention days for one project; saves through `projects.updateProject`. */
export function ProjectPrivacyControls({ projectId }: { projectId: string }) {
  const project = useQuery(api.projects.getProjectForAdmin, { projectId: projectId as Id<"projects"> });
  if (project === undefined) return <p className="captured-settings-placeholder">Loading privacy settings…</p>;
  if (project === null) return <p className="captured-settings-placeholder">Only project admins can change privacy settings.</p>;
  return <PrivacyForm projectId={projectId} project={project} />;
}

function PrivacyForm({ projectId, project }: { projectId: string; project: PrivacyProject }) {
  const updateProject = useMutation(api.projects.updateProject);
  const [redactionEnabled, setRedactionEnabled] = useState(project.redactionEnabled !== false);
  const [redactionRules, setRedactionRules] = useState<string[]>(
    project.redactionRules?.length ? project.redactionRules : [...DEFAULT_REDACTION_RULES],
  );
  const [retentionDays, setRetentionDays] = useState(
    String(effectiveRetentionDays(project.planTier, project.retentionDays) ?? 365),
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const planDays = planRetentionDays(project.planTier);

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setNotice(null);
      setError(null);
      setter(value);
    };
  }
  const changeEnabled = edit(setRedactionEnabled);
  const changeRules = edit(setRedactionRules);
  const changeRetention = edit(setRetentionDays);

  async function save() {
    const parsed = validatePrivacySettings({ redactionEnabled, redactionRules, retentionDays, planTier: project.planTier });
    setNotice(null);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProject({ projectId: projectId as Id<"projects">, ...parsed.value });
      setNotice("Privacy settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <p className="captured-settings-placeholder">Sensitive payloads are scrubbed before they leave the ingest boundary.</p>
      <label className="flex items-center gap-3 font-mono text-[11px] uppercase">
        <input type="checkbox" checked={redactionEnabled} onChange={(event) => changeEnabled(event.target.checked)} />
        Redact sensitive values on ingest
      </label>
      <p id="redaction-rules-label" className="font-mono text-[10px] uppercase text-[#8B93A1]">Redaction rules</p>
      <div role="group" aria-labelledby="redaction-rules-label" className="flex flex-wrap gap-2">
        {DEFAULT_REDACTION_RULES.map((rule) => {
          const selected = redactionRules.includes(rule);
          return (
            <button
              type="button"
              key={rule}
              aria-pressed={selected}
              onClick={() => changeRules(selected ? redactionRules.filter((item) => item !== rule) : [...redactionRules, rule])}
              className={`border px-3 py-2 font-mono text-[10px] uppercase ${selected ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1]"}`}
            >
              {rule.replace("_", " ")}
            </button>
          );
        })}
      </div>
      <div className="grid max-w-xs gap-1.5 text-[11px]">
        <label htmlFor="retention-days">Retention (days)</label>
        <span id="retention-help" className="text-[#8B93A1]">
          {planDays === null
            ? "Your plan sets no limit; older data is removed after this many days."
            : `Your plan keeps data for ${planDays} days at most. Older data is removed every day.`}
        </span>
        <input id="retention-days" type="number" min={1} max={planDays ?? 3650} value={retentionDays} onChange={(event) => changeRetention(event.target.value)} aria-describedby="retention-help" className={field} />
      </div>
      <div className="captured-settings-actions">
        <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
