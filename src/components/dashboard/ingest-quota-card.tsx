"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/dashboard/project-admin-shell";
import { Skeleton } from "@/components/ui/skeleton";

interface IngestQuota {
  used: number;
  limit: number;
  remaining: number;
  resetSeconds: number;
  windowSeconds: number;
  available: boolean;
}

const POLL_INTERVAL_MS = 15_000;

export function IngestQuotaCard({ projectId }: { projectId: string }) {
  const [quota, setQuota] = useState<IngestQuota | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/ingest-quota`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load ingest quota");
        const data = (await res.json()) as IngestQuota;
        if (!cancelled) {
          setQuota(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

  if (!quota && !error) {
    return <Skeleton className="h-28 w-full rounded-none bg-[#111418]" />;
  }

  const usedPct = quota && quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
  const nearLimit = usedPct >= 80;

  return (
    <Panel title="Ingest rate" hint="Spans accepted per rolling 60 seconds. Above it, requests get HTTP 429.">
      {error || !quota?.available ? (
        <p className="font-mono text-[11px] uppercase text-[#8B93A1]">Quota data unavailable right now.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between font-mono">
            <span className={`text-2xl ${nearLimit ? "text-[#FF8A8A]" : "text-[#E6E9EE]"}`}>{quota.used.toLocaleString()}</span>
            <span className="text-[11px] text-[#8B93A1]">/ {quota.limit.toLocaleString()} per minute</span>
          </div>
          <div className="h-2 w-full border border-[#262C35] bg-[#0B0D10]">
            <div className={`h-full ${nearLimit ? "bg-[#FF6B6B]" : "bg-[#E6E9EE]"}`} style={{ width: `${usedPct}%` }} />
          </div>
          <p className="font-mono text-[10px] uppercase text-[#6B7380]">
            {quota.remaining.toLocaleString()} left this window
            {quota.resetSeconds > 0 ? ` · resets in ${quota.resetSeconds}s` : ""}
          </p>
        </div>
      )}
    </Panel>
  );
}
