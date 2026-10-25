import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { inngest } from "@/lib/inngest";
import { persistSpan, type SpanEvent } from "@/lib/span-pipeline";
import { getTracifyRegion } from "@/lib/regions";
import { runRetention } from "@/lib/retention-job";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { renderNoTraceEmail } from "@/lib/email-templates";

/**
 * Milestone 2 activation pipeline:
 * write the span to Tinybird, then update Convex so onboarding can react.
 */
export const processSpan = inngest.createFunction(
  {
    id: "process-span",
    name: "Process ingested span",
    retries: 3,
    triggers: [{ event: "tracify/span.received" }],
  },
  async ({ event, step }) => {
    const span = event.data;

    // /api/ingest stores spans itself before acknowledging them; only older queued events still need storing here.
    if (!span.persisted) {
      await step.run("persist-span", async () => {
        await persistSpan(span as SpanEvent);
      });
    }

    await step.run("online-evaluation", async () => {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      const evaluationSecret = process.env.EVALUATION_INTERNAL_SECRET;
      if (!convexUrl || !evaluationSecret || !span.spanId) return { skipped: true };
      try {
        const response = await fetch(`${convexUrl.replace(/\/$/, "")}/evaluation/online`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-tracify-evaluation-secret": evaluationSecret },
          body: JSON.stringify({
            projectId: span.projectDocId,
            traceId: span.runId,
            spanId: span.spanId,
            spanType: span.spanType,
            input: span.input ?? "",
            output: span.output ?? "",
            modelId: span.modelId ?? "",
            metadata: JSON.stringify(span.metadata ?? {}),
          }),
        });
        if (!response.ok) console.warn("Online evaluation returned", response.status);
        if (response.ok) {
          const body = await response.json().catch(() => null) as { results?: Array<{ resultId?: string; evaluatorId?: string; scoreName?: string; value?: number | boolean | string; status?: string }>; alerts?: Array<{ projectId: string; runId: string; type: string; message: string; triggeredAt: string }> } | null;
          for (const alert of body?.alerts ?? []) await inngest.send({ name: "tracify/alert.triggered", data: alert });
          const tinybird = await import("@/lib/tinybird");
          for (const result of body?.results ?? []) {
            if (!result.resultId || !result.evaluatorId || !result.scoreName || result.value === undefined) continue;
            const dataType = typeof result.value === "number" ? "numeric" : typeof result.value === "boolean" ? "boolean" : "categorical";
            await tinybird.ingestEvaluationScore({ scoreId: result.resultId, projectId: span.projectDocId, traceId: span.runId, evaluatorId: result.evaluatorId, scoreName: result.scoreName, dataType, valueNumeric: typeof result.value === "number" ? result.value : 0, valueBoolean: typeof result.value === "boolean" ? result.value : false, valueCategorical: typeof result.value === "string" ? result.value : "", status: result.status ?? "passed", modelId: span.modelId ?? "", environment: span.environment ?? "", createdAt: new Date().toISOString() }).catch((error) => console.warn("Tinybird score ingest failed without blocking ingestion", error));
          }
        }
        return { skipped: false, status: response.status };
      } catch (error) {
        console.warn("Online evaluation failed without blocking ingestion", error);
        return { skipped: false, error: error instanceof Error ? error.message : "Online evaluation failed" };
      }
    });

    await step.run("check-thresholds", async () => {
      const convex = getConvexClient();
      const project = await convex.query(api.projects.getById, {
        id: span.projectDocId as Id<"projects">,
      });
      const run = await convex.query(api.agentRuns.getByRunId, {
        runId: span.runId,
        projectId: span.projectDocId as Id<"projects">,
      });

      if (project?.costThresholdUsd && run && run.totalCostUsd > project.costThresholdUsd) {
        await inngest.send({
          name: "tracify/alert.triggered",
          data: {
            projectId: span.projectDocId,
            runId: span.runId,
            type: "cost_exceeded",
            message: `Run ${span.runId} exceeded cost threshold of $${project.costThresholdUsd}. Current cost: $${run.totalCostUsd.toFixed(4)}`,
            triggeredAt: new Date().toISOString(),
          },
        });
      }

      if (span.spanType === "error") {
        await inngest.send({
          name: "tracify/alert.triggered",
          data: {
            projectId: span.projectDocId,
            runId: span.runId,
            type: "run_failed",
            message: `Run ${span.runId} encountered an error span.`,
            triggeredAt: new Date().toISOString(),
          },
        });
      }
    });

    return { ok: true, spanId: span.spanId };
  },
);

export const onboardingReminder = inngest.createFunction(
  { id: "onboarding-reminder", name: "Send onboarding reminder", retries: 3, triggers: [{ event: "tracify/onboarding.reminder" }] },
  async ({ event, step }) => {
    await step.sleep("wait-one-day", "1d");
    const state = await step.run("check-activation", async () => getConvexClient().query(api.agentRuns.getProjectOnboardingState, { projectId: event.data.projectId as Id<"projects"> }));
    if (state?.hasReceivedFirstSpan) return { skipped: true, reason: "activated" };
    const origin = getTracifyRegion().origin;
    const email = renderNoTraceEmail({ name: event.data.name, projectName: event.data.projectName, projectId: event.data.projectId, origin });
    await step.run("send-reminder", async () => sendTransactionalEmail({ to: event.data.email, ...email, idempotencyKey: `onboarding-reminder-${event.data.projectId}` }));
    return { skipped: false };
  },
);

export const processAlert = inngest.createFunction(
  {
    id: "process-alert",
    name: "Process alert",
    triggers: [{ event: "tracify/alert.triggered" }],
  },
  async ({ event, step }) => {
    const alert = event.data;

    await step.run("log-to-convex", async () => {
      const convex = getConvexClient();
      await convex.mutation(api.alerts.create, {
        projectId: alert.projectId as Id<"projects">,
        runId: alert.runId,
        type: alert.type,
        message: alert.message,
        triggeredAt: alert.triggeredAt,
      });
    });

    await step.run("notify-slack", async () => {
      const convex = getConvexClient();
      const project = await convex.query(api.projects.getById, {
        id: alert.projectId as Id<"projects">,
      });

      if (project?.slackWebhookUrl) {
        await fetch(project.slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `🚨 *Tracify Alert: ${alert.type.replace('_', ' ').toUpperCase()}*`
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: alert.message
                }
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "View Trace",
                      emoji: true
                    },
                    url: `${getTracifyRegion().origin}/dashboard/${alert.projectId}/runs/${alert.runId}`,
                    style: "primary"
                  }
                ]
              }
            ]
          }),
        });
      }
    });

    await step.run("notify-teams", async () => {
      const convex = getConvexClient();
      const project = await convex.query(api.projects.getById, {
        id: alert.projectId as Id<"projects">,
      });

      if (project?.teamsWebhookUrl) {
        await fetch(project.teamsWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            summary: `Tracify Alert: ${alert.type}`,
            themeColor: "000000",
            title: `🚨 Tracify Alert: ${alert.type.replace('_', ' ').toUpperCase()}`,
            text: alert.message,
            potentialAction: [
              {
                "@type": "OpenUri",
                name: "View Trace",
                targets: [
                  {
                    os: "default",
                    uri: `${getTracifyRegion().origin}/dashboard/${alert.projectId}/runs/${alert.runId}`,
                  },
                ],
              },
            ],
          }),
        });
      }
    });

    return { ok: true };
  },
);

/** Every day at 03:17 UTC: delete data older than each plan keeps (7 / 30 / 90 days). Needs TRACIFY_RETENTION_SECRET. */
export const dailyRetention = inngest.createFunction(
  { id: "daily-retention", name: "Remove data past plan retention", retries: 2, triggers: [{ cron: "17 3 * * *" }] },
  async ({ step }) => {
    const secret = process.env.TRACIFY_RETENTION_SECRET;
    if (!secret) return { skipped: true, reason: "TRACIFY_RETENTION_SECRET is not set" };
    return step.run("purge", () => runRetention(secret));
  },
);
