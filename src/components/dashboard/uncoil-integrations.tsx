"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function UncoilIntegrations({ projectId }: { projectId: string }) {
  const project = useQuery(api.projects.getProjectById, { projectId: projectId as Id<"projects"> });
  const updateProject = useMutation(api.projects.updateProject);
  const sendTestAlert = useAction(api.projects.sendTestAlert);
  const [slack, setSlack] = useState("");
  const [teams, setTeams] = useState("");
  const [discord, setDiscord] = useState("");
  const [discordCleared, setDiscordCleared] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (project) { setSlack(project.slackWebhookUrl || ""); setTeams(project.teamsWebhookUrl || ""); setDiscord(""); setDiscordCleared(false); } }, [project]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function save() {
    setSaving(true); setNotice("");
    try { await updateProject({ projectId: projectId as Id<"projects">, slackWebhookUrl: slack.trim() || undefined, teamsWebhookUrl: teams.trim() || undefined, ...(discordCleared ? { discordWebhookUrl: "" } : discord.trim() ? { discordWebhookUrl: discord.trim() } : {}) }); setNotice("Integration settings saved."); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save integration settings."); } finally { setSaving(false); }
  }

  async function test(channel: "slack" | "teams" | "discord") {
    setNotice("");
    try { await sendTestAlert({ projectId: projectId as Id<"projects">, channel }); setNotice(`${channel === "slack" ? "Slack" : channel === "teams" ? "Teams" : "Discord"} test alert sent.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Test alert failed."); }
  }

  if (!project) return <div className="border border-[#262C35] bg-[#0E1115] p-6 font-mono text-[10px] uppercase tracking-widest text-[#8B93A1]">Loading integrations…</div>;
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">{[["SDK ingestion", "Send traces from the TypeScript or Python SDK.", `/dashboard/${projectId}/quickstart`], ["OpenTelemetry", "Ingest OTLP spans through the Uncoil endpoint.", `/dashboard/${projectId}/docs`], ["MCP & CLI", "Connect developer tools to this project.", `/dashboard/${projectId}/settings/mcp-cli`]].map(([title, description, href]) => <a key={title} href={href} className="border border-[#262C35] bg-[#0E1115] p-5 transition-colors hover:border-[#F4D44D]"><p className="font-mono text-[11px] uppercase tracking-widest">{title}</p><p className="mt-3 text-sm leading-6 text-[#8B93A1]">{description}</p><span className="mt-5 block font-mono text-[9px] uppercase tracking-widest text-[#8B93A1]">Configure →</span></a>)}</div>
    <section className="border border-[#262C35] bg-[#0E1115] p-6"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">Alert destinations</p><h2 className="mt-2 font-pixel text-4xl tracking-[-0.05em]">Connect your team.</h2><div className="mt-6 grid gap-6 md:grid-cols-2"><WebhookCard label="Slack" value={slack} onChange={setSlack} placeholder="https://hooks.slack.com/services/..." onTest={() => void test("slack")} /><WebhookCard label="Microsoft Teams" value={teams} onChange={setTeams} placeholder="https://*.webhook.office.com/..." onTest={() => void test("teams")} /><WebhookCard label="Discord" value={discord} onChange={(value) => { setDiscord(value); setDiscordCleared(false); }} connected={project.hasDiscordWebhook && !discordCleared} onClear={() => { setDiscord(""); setDiscordCleared(true); }} placeholder="https://discord.com/api/webhooks/..." onTest={() => void test("discord")} /></div><div className="mt-6 flex items-center gap-4"><button type="button" onClick={() => void save()} disabled={saving} className="bg-black px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white hover:bg-[#f4d44d] hover:text-[#E6E9EE] disabled:opacity-50">{saving ? "Saving…" : "Save integrations"}</button>{notice ? <span className="font-mono text-[10px] text-[#8B93A1]" role="status">{notice}</span> : null}</div></section>
  </div>;
}

function WebhookCard({ label, value, onChange, placeholder, onTest, connected, onClear }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; onTest: () => void; connected?: boolean; onClear?: () => void }) {
  return <div className="border border-[#1F242C] p-4"><h3 className="font-mono text-[12px] uppercase tracking-widest">{label}</h3><p className="mt-2 text-xs leading-5 text-[#8B93A1]">Receive Uncoil alert notifications in this destination.</p>{connected ? <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[#F4D44D]">Connected</p> : null}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={connected ? "Paste a new link to replace it" : placeholder} className="mt-4 h-10 w-full border border-[#262C35] bg-[#0B0D10] px-3 font-mono text-[10px] text-[#E6E9EE] outline-none focus:border-black" /><button type="button" onClick={onTest} disabled={!value.trim() && !connected} className="mt-3 border border-[#262C35] !bg-transparent px-3 py-2 font-mono text-[9px] uppercase tracking-widest !text-[#E6E9EE] hover:border-[#F4D44D] hover:text-[#E6E9EE] disabled:opacity-40">Send test alert</button>{connected && onClear ? <button type="button" onClick={onClear} className="mt-3 ml-3 border border-[#262C35] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#8B93A1] hover:border-[#F4D44D]">Clear</button> : null}</div>;
}
