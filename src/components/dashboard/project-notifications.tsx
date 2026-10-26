"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const card = "border border-[#262C35] bg-[#0E1115] p-5";
const eyebrow = "font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]";
const link = "mt-4 inline-block border border-[#262C35] px-3 py-2 font-mono text-[10px] uppercase tracking-widest !text-[#E6E9EE] no-underline hover:border-[#F4D44D]";

/** Where alerts for this project go, and which emails you get. Reads only; changes happen in the linked places. */
export function ProjectNotifications({ projectId }: { projectId: string }) {
  const project = useQuery(api.projects.getProjectById, { projectId: projectId as Id<"projects"> });
  const prefs = useQuery(api.notificationPreferences.get, {});
  const savePrefs = useMutation(api.notificationPreferences.set);
  if (!project) return <div className={`${card} ${eyebrow}`}>Loading notifications…</div>;

  const value = { operational: prefs?.operational ?? true, product: prefs?.product ?? false };
  const channels = [
    { name: "Slack", on: Boolean(project.slackWebhookUrl) },
    { name: "Microsoft Teams", on: Boolean(project.teamsWebhookUrl) },
  ];
  const emails = [
    { key: "operational" as const, title: "Setup help", text: "Welcome, setup, first-trace and important account messages." },
    { key: "product" as const, title: "Product updates", text: "Occasional feature and release notes." },
  ];

  return (
    <div className="grid gap-5">
      <section className={card}>
        <p className={eyebrow}>Where alerts go</p>
        <ul className="mt-4 divide-y divide-[#1F242C] border border-[#1F242C]">
          {channels.map((channel) => (
            <li key={channel.name} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="font-mono text-sm text-[#E6E9EE]">{channel.name}</span>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${channel.on ? "text-[#5BE3A0]" : "text-[#8B93A1]"}`}>{channel.on ? "Connected" : "Not connected"}</span>
            </li>
          ))}
        </ul>
        <Link href={`/dashboard/${projectId}/settings?tab=Integrations`} className={link}>Connect or test →</Link>
      </section>

      <section className={card}>
        <p className={eyebrow}>What triggers them</p>
        <p className="mt-3 text-sm leading-6 text-[#8B93A1]">Alert rules decide what counts as a problem, and each rule can be snoozed or silenced during quiet hours.</p>
        <Link href={`/dashboard/${projectId}/alerts`} className={link}>Open alert rules →</Link>
      </section>

      <section className={card}>
        <p className={eyebrow}>Your emails</p>
        <ul className="mt-4 divide-y divide-[#1F242C] border border-[#1F242C]">
          {emails.map((row) => (
            <li key={row.key}>
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4">
                <span>
                  <span className="block font-mono text-sm text-[#E6E9EE]">{row.title}</span>
                  <span className="block text-[13px] text-[#8B93A1]">{row.text}</span>
                </span>
                <input type="checkbox" className="size-4 accent-[#F4D44D]" checked={value[row.key]} onChange={(event) => void savePrefs({ ...value, [row.key]: event.target.checked })} />
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#8B93A1]">These follow your account, not just this project.</p>
      </section>
    </div>
  );
}
