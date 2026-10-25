"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, Send, Save } from "lucide-react";
import { captureAnalytics } from "@/lib/analytics";
import { DEFAULT_REDACTION_RULES } from "@/lib/redaction";
import { effectiveRetentionDays, planRetentionDays } from "@/lib/retention";

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

interface ProjectSettingsProps {
  projectId: string;
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const project = useQuery(
    api.projects.getProjectById, 
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const updateProject = useMutation(api.projects.updateProject);
  const sendTestAlert = useAction(api.projects.sendTestAlert);

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [costThreshold, setCostThreshold] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [maxStall, setMaxStall] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState("");
  const [redactionEnabled, setRedactionEnabled] = useState(true);
  const [redactionRules, setRedactionRules] = useState<string[]>([...DEFAULT_REDACTION_RULES]);
  const [retentionDays, setRetentionDays] = useState("365");
  const [saving, setSaving] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (project) {
      setName(project.name);
      setClientName(project.clientName || "");
      setReportNotes(project.reportNotes || "");
      setCostThreshold(project.costThresholdUsd?.toString() || "1.00");
      setMaxDuration(project.maxDurationSeconds?.toString() || "300");
      setMaxStall(project.maxStallMinutes?.toString() || "5");
      setSlackWebhookUrl(project.slackWebhookUrl || "");
      setTeamsWebhookUrl(project.teamsWebhookUrl || "");
      setRedactionEnabled(project.redactionEnabled !== false);
      setRedactionRules(project.redactionRules?.length ? project.redactionRules : [...DEFAULT_REDACTION_RULES]);
      setRetentionDays(String(effectiveRetentionDays(project.planTier, project.retentionDays) ?? 365));
    }
  }, [project]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!projectId) {
    return <div className="border border-black/15 bg-white p-6"><h2 className="font-mono text-xl text-black">Project Settings</h2><p className="mt-2 max-w-xl font-sans text-sm leading-6 text-black/60">Project settings are shown read-only until a project is selected.</p></div>;
  }

  async function handleSave() {
    if (!projectId) return;
    const parsed = validateSettings({
      name,
      clientName,
      reportNotes,
      costThreshold,
      maxDuration,
      maxStall,
      slackWebhookUrl,
      teamsWebhookUrl,
      redactionEnabled,
      redactionRules,
      retentionDays,
    });
    if (!parsed.ok) {
      setNotice(null);
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await updateProject({
        projectId: projectId as Id<"projects">,
        name: parsed.value.name,
        clientName: parsed.value.clientName,
        reportNotes: parsed.value.reportNotes,
        costThresholdUsd: parsed.value.costThresholdUsd,
        maxDurationSeconds: parsed.value.maxDurationSeconds,
        maxStallMinutes: parsed.value.maxStallMinutes,
        slackWebhookUrl: parsed.value.slackWebhookUrl,
        teamsWebhookUrl: parsed.value.teamsWebhookUrl,
        redactionEnabled: parsed.value.redactionEnabled,
        redactionRules: parsed.value.redactionRules,
        retentionDays: parsed.value.retentionDays,
      });
      if (isPostHogConfigured) {
        captureAnalytics("project_settings_saved");
      }
      setNotice("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestAlert() {
    if (!projectId) return;
    if (!isValidSlackWebhookUrl(slackWebhookUrl.trim())) {
      setNotice(null);
      setError("Add a valid Slack webhook URL before sending a test alert");
      return;
    }

    setTestingSlack(true);
    setError(null);
    setNotice(null);
    try {
      await sendTestAlert({ projectId: projectId as Id<"projects">, channel: "slack" });
      if (isPostHogConfigured) {
        captureAnalytics("test_alert_sent");
      }
      setNotice("Test alert sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test alert");
    } finally {
      setTestingSlack(false);
    }
  }

  async function handleSendTeamsTestAlert() {
    if (!projectId) return;
    if (!isValidTeamsWebhookUrl(teamsWebhookUrl.trim())) {
      setNotice(null);
      setError("Add a valid Teams webhook URL before sending a test alert");
      return;
    }

    setTestingTeams(true);
    setError(null);
    setNotice(null);
    try {
      await sendTestAlert({ projectId: projectId as Id<"projects">, channel: "teams" });
      if (isPostHogConfigured) {
        captureAnalytics("test_alert_sent_teams");
      }
      setNotice("Test alert sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test alert");
    } finally {
      setTestingTeams(false);
    }
  }

  if (project === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-none" />
        <Skeleton className="h-60 w-full rounded-none" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* General Settings */}
      <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
        <div>
          <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">General Settings</h3>
          <p className="text-[11px] text-black/55 mt-1">Basic project identification and identity.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Project Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="rounded-none border-black/15 bg-white text-black font-mono h-10"
            />
          </div>
          
          <div className="space-y-2 opacity-50">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Project ID</label>
            <Input 
              value={projectId} 
              readOnly
              className="rounded-none border-black/15 bg-white text-black/55 font-mono h-10 cursor-not-allowed"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Client / Workspace Label</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Support Agent"
                className="rounded-none border-black/15 bg-white text-black font-mono h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Report Notes</label>
              <Input
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Beta weekly reliability report"
                className="rounded-none border-black/15 bg-white text-black font-mono h-10"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
        <div>
          <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">Privacy & Retention</h3>
          <p className="text-[11px] text-black/55 mt-1">Sensitive payloads are scrubbed before they leave the ingest boundary.</p>
        </div>
        <label className="flex items-center gap-3 text-[11px] text-black/70 font-mono uppercase">
          <input type="checkbox" checked={redactionEnabled} onChange={(e) => setRedactionEnabled(e.target.checked)} className="accent-white" />
          Redact sensitive values on ingest
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_REDACTION_RULES.map((rule) => {
            const selected = redactionRules.includes(rule);
            return (
              <button
                type="button"
                key={rule}
                onClick={() => setRedactionRules((current) => selected ? current.filter((item) => item !== rule) : [...current, rule])}
                className={`border px-3 py-2 font-mono text-[10px] uppercase ${selected ? "border-black text-black" : "border-black/15 text-black/55"}`}
              >
                {rule.replace("_", " ")}
              </button>
            );
          })}
        </div>
        <div className="max-w-xs space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Retention (days)</label>
          <p className="text-[11px] text-black/55">{planRetentionDays(project?.planTier) === null ? "Your plan sets no limit; older data is removed after this many days." : `Your plan keeps data for ${planRetentionDays(project?.planTier)} days at most. Older data is removed every day.`}</p>
          <Input type="number" min="1" max={planRetentionDays(project?.planTier) ?? 3650} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="rounded-none border-black/15 bg-white text-black font-mono h-10" />
        </div>
      </Card>

      {/* Thresholds & Limits */}
      <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
        <div>
          <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">Alert Thresholds</h3>
          <p className="text-[11px] text-black/55 mt-1">Set boundaries for your agent&apos;s resource usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Cost (USD)</label>
            <Input 
              type="number"
              step="0.01"
              value={costThreshold} 
              onChange={(e) => setCostThreshold(e.target.value)}
              className="rounded-none border-black/15 bg-white text-black font-mono h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Duration (sec)</label>
            <Input 
              type="number"
              value={maxDuration} 
              onChange={(e) => setMaxDuration(e.target.value)}
              className="rounded-none border-black/15 bg-white text-black font-mono h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Stall (min)</label>
            <Input 
              type="number"
              value={maxStall} 
              onChange={(e) => setMaxStall(e.target.value)}
              className="rounded-none border-black/15 bg-white text-black font-mono h-10"
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-black/15">
          <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono text-black/55">Slack Webhook URL</label>
          <Input 
            value={slackWebhookUrl} 
            onChange={(e) => setSlackWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="rounded-none border-black/15 bg-white text-black font-mono h-10"
          />
          <p className="text-[9px] text-black/55 font-mono uppercase">Alerts will be sent to this channel when thresholds are exceeded.</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTestAlert}
            disabled={testingSlack || !slackWebhookUrl.trim()}
            className="mt-2 h-8 rounded-none border-black/15 font-mono text-[10px] uppercase"
          >
            <Send className="size-3" />
            {testingSlack ? "Sending..." : "Send test alert"}
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t border-black/15">
          <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono text-black/55">Teams Webhook URL</label>
          <Input
            value={teamsWebhookUrl}
            onChange={(e) => setTeamsWebhookUrl(e.target.value)}
            placeholder="https://*.webhook.office.com/webhookb2/..."
            className="rounded-none border-black/15 bg-white text-black font-mono h-10"
          />
          <p className="text-[9px] text-black/55 font-mono uppercase">Alerts will be sent to this Microsoft Teams channel when thresholds are exceeded.</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTeamsTestAlert}
            disabled={testingTeams || !teamsWebhookUrl.trim()}
            className="mt-2 h-8 rounded-none border-black/15 font-mono text-[10px] uppercase"
          >
            <Send className="size-3" />
            {testingTeams ? "Sending..." : "Send test alert"}
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between pt-4">
        {error ? (
          <div className="flex items-center gap-2 text-red-600 text-[11px] font-mono">
            <AlertCircle className="size-3" />
            {error}
          </div>
        ) : notice ? (
          <div className="text-[11px] font-mono text-black/60">{notice}</div>
        ) : null}
        <div />
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="rounded-none h-10 px-8 font-mono uppercase text-xs"
        >
          {saving ? "Saving..." : <span className="flex items-center gap-2"><Save className="size-4" /> Save Changes</span>}
        </Button>
      </div>

      <div className="pt-12">
        <div className="border border-red-900/30 bg-red-950/5 p-6 rounded-none space-y-4">
          <div>
            <h3 className="font-mono text-[14px] text-red-600 uppercase tracking-widest">Danger Zone</h3>
            <p className="text-[11px] text-red-500/60 mt-1 uppercase tracking-tighter">Permanently delete this project and all of its data.</p>
          </div>
          
          <Link
            href={`/dashboard/${projectId}/manage`}
            className={buttonVariants({
              variant: "destructive",
              className: "h-10 px-6 text-xs uppercase",
            })}
          >
            Open Management
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function validateSettings(values: {
  name: string;
  clientName: string;
  reportNotes: string;
  costThreshold: string;
  maxDuration: string;
  maxStall: string;
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
  redactionEnabled: boolean;
  redactionRules: string[];
  retentionDays: string;
}):
  | {
      ok: true;
      value: {
        name: string;
        clientName?: string;
        reportNotes?: string;
        costThresholdUsd: number;
        maxDurationSeconds: number;
        maxStallMinutes: number;
        slackWebhookUrl?: string;
        teamsWebhookUrl?: string;
        redactionEnabled: boolean;
        redactionRules: string[];
        retentionDays: number;
      };
    }
  | { ok: false; error: string } {
  const name = values.name.trim();
  const costThresholdUsd = Number(values.costThreshold);
  const maxDurationSeconds = Number(values.maxDuration);
  const maxStallMinutes = Number(values.maxStall);
  const slackWebhookUrl = values.slackWebhookUrl.trim();
  const teamsWebhookUrl = values.teamsWebhookUrl.trim();
  const retentionDays = Number(values.retentionDays);

  if (!name) return { ok: false, error: "Project name is required" };
  if (!Number.isFinite(costThresholdUsd) || costThresholdUsd < 0) {
    return { ok: false, error: "Cost threshold must be a non-negative number" };
  }
  if (!Number.isInteger(maxDurationSeconds) || maxDurationSeconds <= 0) {
    return { ok: false, error: "Duration threshold must be a positive integer" };
  }
  if (!Number.isInteger(maxStallMinutes) || maxStallMinutes <= 0) {
    return { ok: false, error: "Stall threshold must be a positive integer" };
  }
  if (slackWebhookUrl && !isValidSlackWebhookUrl(slackWebhookUrl)) {
    return { ok: false, error: "Slack webhook must be a valid Slack webhook URL" };
  }
  if (teamsWebhookUrl && !isValidTeamsWebhookUrl(teamsWebhookUrl)) {
    return { ok: false, error: "Teams webhook must be a valid Microsoft Teams webhook URL" };
  }
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return { ok: false, error: "Retention must be an integer between 1 and 3650 days" };
  }

  return {
    ok: true,
    value: {
      name,
      clientName: values.clientName.trim() || undefined,
      reportNotes: values.reportNotes.trim() || undefined,
      costThresholdUsd,
      maxDurationSeconds,
      maxStallMinutes,
      slackWebhookUrl: slackWebhookUrl || undefined,
      teamsWebhookUrl: teamsWebhookUrl || undefined,
      redactionEnabled: values.redactionEnabled,
      redactionRules: values.redactionRules,
      retentionDays,
    },
  };
}

function isValidSlackWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "hooks.slack.com" &&
      url.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}

function isValidTeamsWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".webhook.office.com") || url.hostname.endsWith(".logic.azure.com"))
    );
  } catch {
    return false;
  }
}
