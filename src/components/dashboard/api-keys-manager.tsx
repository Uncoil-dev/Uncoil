"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyValue, Panel, adminButton, adminButtonPrimary } from "@/components/dashboard/project-admin-shell";
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
    return <Skeleton className="h-52 w-full rounded-none bg-[#111418]" />;
  }

  if (!project) {
    return (
      <div className="border border-dashed border-[#262C35] py-16 text-center font-mono text-sm uppercase tracking-widest text-[#8B93A1]">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Ingest key"
        hint="Lets your agents send runs to this project."
        action={
          <button type="button" onClick={handleRotate} disabled={rotating} className={adminButton}>
            <RefreshCw className="size-3" aria-hidden /> {rotating ? "Rotating..." : "Rotate key"}
          </button>
        }
      >
        {newKey ? (
          <div className="space-y-3 border border-[#F4D44D]/50 bg-[#0B0D10] p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase text-[#E6E9EE]">
              <AlertTriangle className="size-3.5 text-[#F4D44D]" aria-hidden />
              Copy your new key now
            </div>
            <p className="text-[13px] text-[#8B93A1]">It is shown once. If you lose it, rotate again.</p>
            <div className="flex items-center gap-2">
              <div className="flex h-10 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap border border-[#262C35] bg-[#0E1115] px-3 font-mono text-[13px] text-[#E6E9EE]">
                {newKey}
              </div>
              <button type="button" onClick={() => copyToClipboard(newKey)} className={`${adminButtonPrimary} h-10 w-12`} aria-label="Copy key">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex h-10 items-center overflow-x-auto whitespace-nowrap border border-[#262C35] bg-[#0B0D10] px-3 font-mono text-[13px] text-[#8B93A1]">
              {project.apiKeyPrefix}************{project.apiKeyLast4}
            </div>
            <dl>
              <KeyValue label="Created" value={project.apiKeyCreatedAt ? formatRelativeTime(project.apiKeyCreatedAt) : "Unknown"} />
              <KeyValue label="Last used" value={project.apiKeyLastUsedAt ? formatRelativeTime(project.apiKeyLastUsedAt) : "Never"} />
            </dl>
          </div>
        )}
      </Panel>

      <Panel title="Keep it safe">
        <ul className="space-y-2 text-[13px] leading-6 text-[#8B93A1]">
          <li>Store the key in an environment variable, never in version control.</li>
          <li>Rotating stops the old key at once. Agents using it fail to send data until you update them.</li>
          <li>If a key leaks, rotate it right away.</li>
        </ul>
      </Panel>
    </div>
  );
}
