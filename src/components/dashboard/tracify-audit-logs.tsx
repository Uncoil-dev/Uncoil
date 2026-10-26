"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function TracifyAuditLogs({ projectId }: { projectId: string }) {
  const logs = useQuery(api.auditLogs.listByProject, { projectId: projectId as Id<"projects">, limit: 100 });

  return (
    <section className="border border-[#262C35] bg-[#0E1115]">
      <div className="grid grid-cols-[minmax(0,1fr)_150px_190px] border-b border-[#262C35] bg-[#151A20] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8B93A1]">
        <span>Event</span><span>Actor</span><span>Timestamp</span>
      </div>
      {logs === undefined ? <p className="p-6 font-mono text-[10px] uppercase tracking-widest text-[#8B93A1]">Loading audit events…</p> : logs.length === 0 ? <p className="p-6 text-sm text-[#8B93A1]">No administrative activity has been recorded for this project yet.</p> : logs.map((log) => (
        <div key={log._id} className="grid grid-cols-[minmax(0,1fr)_150px_190px] items-center border-b border-[#1F242C] px-4 py-4 last:border-b-0">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8B93A1]">{log.action} · {log.resource}</p><p className="mt-1 text-sm text-[#E6E9EE]">{log.summary}</p></div>
          <span className="truncate font-mono text-[10px] text-[#8B93A1]">{log.actorEmail || log.actorId}</span>
          <time className="font-mono text-[10px] text-[#8B93A1]" dateTime={new Date(log.createdAt).toISOString()}>{new Date(log.createdAt).toLocaleString()}</time>
        </div>
      ))}
    </section>
  );
}
