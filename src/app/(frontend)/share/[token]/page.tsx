import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { ogImageUrl } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { getSpansForRun } from "@/lib/tinybird";
import { SharedTraceView, type SharedSpan } from "@/components/share/shared-trace-view";

export const dynamic = "force-dynamic";
const MAX_SPANS = 500;

async function resolveToken(token: string) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  // No sign-in: the unguessable link is the permission, and revoking it makes this query return null.
  return new ConvexHttpClient(url).query(api.sharedTraces.resolve, { token });
}

// The link preview shows only the run's headline numbers. Never inputs, outputs or user data.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const shared = await resolveToken(token).catch(() => null);
  const robots = { index: false, follow: false };
  if (!shared) return { title: "Shared run", robots };
  const failed = shared.status === "failed";
  const steps = `${shared.spanCount} step${shared.spanCount === 1 ? "" : "s"}`;
  const cost = formatCurrency(shared.totalCostUsd);
  const title = `${failed ? "Failed agent run" : "Agent run"} · ${steps} · ${cost}`;
  const description = `A read-only trace shared from Uncoil${shared.primaryModel ? `, main model ${shared.primaryModel}` : ""}. Open it to see every step, input and output.`;
  const image = ogImageUrl({ title, kicker: failed ? "Shared run · failed" : "Shared run", sub: shared.primaryModel ?? "See every step of this agent run", kind: "page" });
  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: "website", siteName: "Uncoil", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedTracePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await resolveToken(token);
  if (!shared) notFound();

  let spans: SharedSpan[] = [];
  let unavailable = false;
  try {
    const rows = await getSpansForRun(shared.runId, shared.projectId);
    // Only what is needed to read the trace. User ids, sessions, metadata and stack traces stay private.
    spans = rows.slice(0, MAX_SPANS).map((span) => ({
      spanId: span.spanId,
      parentSpanId: span.parentSpanId || "",
      spanType: span.spanType,
      label: span.modelId || span.toolName || span.spanType,
      input: span.input ?? "",
      output: span.output ?? "",
      latencyMs: Number(span.latencyMs) || 0,
      costUsd: Number(span.costUsd) || 0,
      inputTokens: Number(span.inputTokens) || 0,
      outputTokens: Number(span.outputTokens) || 0,
      errorMessage: span.errorMessage ?? "",
      createdAt: span.createdAt,
    }));
  } catch {
    unavailable = true;
  }

  return (
    <SharedTraceView
      run={{
        runId: shared.runId,
        status: shared.status,
        spanCount: shared.spanCount,
        totalCostUsd: shared.totalCostUsd,
        startedAt: shared.startedAt,
        finishedAt: shared.finishedAt ?? null,
        primaryModel: shared.primaryModel ?? null,
      }}
      spans={spans}
      unavailable={unavailable}
    />
  );
}
