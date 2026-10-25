"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { captureAnalytics } from "@/lib/analytics";

const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

interface ApiKeysManagerProps {
  projectId: string;
}

export function ApiKeysManager({ projectId }: ApiKeysManagerProps) {
  const project = useQuery(
    api.projects.getProjectById, 
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const rotateApiKey = useMutation(api.projects.rotateApiKey);

  const [newKey, setNewKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRotate() {
    if (!projectId) return;
    if (!window.confirm("Rotating your API key will immediately invalidate the existing key. Any agents using the old key will fail to ingest data. Continue?")) {
      return;
    }

    setRotating(true);
    try {
      const result = await rotateApiKey({ projectId: projectId as Id<"projects"> });
      if (isPostHogConfigured) {
        captureAnalytics("api_key_rotated");
      }
      setNewKey(result.plaintextApiKey);
    } catch (err) {
      console.error("Failed to rotate API key:", err);
    } finally {
      setRotating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (project === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-none" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="border border-dashed border-border py-16 text-center font-mono text-sm uppercase tracking-widest text-black/55">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <Card className="p-6 rounded-none border-border bg-white shadow-none space-y-6">
        <div className="flex items-start justify-between gap-3 max-sm:flex-col">
          <div>
            <h3 className="font-mono text-[14px] text-black uppercase tracking-widest">Active API Key</h3>
            <p className="text-[11px] text-black/55 mt-1">This key grants write access to your project&apos;s ingestion pipeline.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRotate}
            disabled={rotating}
            className="rounded-none border-black/15 h-8 px-3 font-mono text-[10px] uppercase hover:bg-black hover:text-white max-sm:h-10"
          >
            {rotating ? "Rotating..." : <span className="flex items-center gap-2"><RefreshCw className="size-3" /> Rotate Key</span>}
          </Button>
        </div>

        {newKey ? (
          <div className="p-4 border border-black bg-black/5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-black text-[11px] font-mono uppercase font-bold">
              <AlertTriangle className="size-3" />
              Copy your new API key now
            </div>
            <p className="text-[11px] text-black/60 font-sans">
              This key will only be shown once. If you lose it, you will have to rotate it again.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 bg-white border border-black/20 px-3 flex items-center font-mono text-sm text-black overflow-x-auto whitespace-nowrap">
                {newKey}
              </div>
              <Button 
                onClick={() => copyToClipboard(newKey)}
                className="rounded-none h-10 px-4 bg-black text-white hover:bg-black/80"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 h-10 bg-white border border-black/15 px-3 flex items-center font-mono text-sm text-black/55 overflow-x-auto whitespace-nowrap">
                {project.apiKeyPrefix}************{project.apiKeyLast4}
              </div>
              <Button 
                variant="outline"
                disabled
                className="rounded-none h-10 px-4 border-black/15 text-black/55 cursor-not-allowed"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Created</label>
                <div className="text-[11px] font-mono text-black/60">
                  {project.apiKeyCreatedAt ? formatRelativeTime(project.apiKeyCreatedAt) : "Unknown"}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] uppercase tracking-widest text-black/55 font-mono">Last Used</label>
                <div className="text-[11px] font-mono text-black/60">
                  {project.apiKeyLastUsedAt ? formatRelativeTime(project.apiKeyLastUsedAt) : "Never"}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2 border border-dashed border-black/15 p-6">
        <h4 className="font-mono text-[12px] text-black/60 uppercase tracking-widest">Security Note</h4>
        <p className="text-[11px] text-black/55 leading-relaxed">
          API keys carry the same level of access as your login credentials for data ingestion. 
          Never commit them to version control or share them in public forums. 
          If a key is compromised, rotate it immediately.
        </p>
      </div>
    </div>
  );
}
