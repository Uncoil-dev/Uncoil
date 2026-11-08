import { PLAN_RETENTION_DAYS } from "@/lib/retention";

/**
 * Public "where your data lives" facts for the EU cloud. Every line here must stay true:
 * - Convex, Redis: config/regional-cloud.json (aws eu-west-1, Ireland).
 * - Queue: Inngest Cloud runs in the US (config/regional-cloud.json, eventProcessing).
 * - Backups: nightly to Cloudflare R2 bucket in the EU, 14 days kept (see memory.md).
 * Set TRACE_STORE_LOCATION to the country of the trace database server once confirmed;
 * until then the page names no country for it, on purpose.
 */
export const TRACE_STORE_LOCATION: string | null = null;

export const BACKUP_DAYS = 14;

export type DataLocation = {
  what: string;
  where: string;
  place: string;
  eu: "yes" | "no" | "own";
  note: string;
};

export const dataLocations: readonly DataLocation[] = [
  {
    what: "Account and project data",
    where: "Convex",
    place: "Ireland (AWS eu-west-1)",
    eu: "yes",
    note: "Sign-in, projects, API-key hashes, alerts, prompts, datasets, comments, scores and settings.",
  },
  {
    what: "Traces and steps",
    where: "Our own ClickHouse database",
    place: TRACE_STORE_LOCATION ?? "A server we run, not a shared cloud",
    eu: "own",
    note: "Every run and every step, with inputs and outputs after redaction.",
  },
  {
    what: "Cache and rate limits",
    where: "Upstash Redis",
    place: "Ireland (primary region)",
    eu: "yes",
    note: "Short-lived counters and cached chart data.",
  },
  {
    what: "Encrypted backups",
    where: "Cloudflare R2",
    place: "EU bucket",
    eu: "yes",
    note: `Nightly copies. Each one is deleted after ${BACKUP_DAYS} days.`,
  },
  {
    what: "Event queue",
    where: "Inngest Cloud",
    place: "United States (Ohio)",
    eu: "no",
    note: "Spans pass through on the way in, after email, phone, card, SSN and API-key patterns are redacted.",
  },
  {
    what: "Payments",
    where: "Stripe",
    place: "Stripe's own regions",
    eu: "no",
    note: "Billing only. Uncoil never stores full card numbers.",
  },
];

export const retentionRows = [
  ["Free", PLAN_RETENTION_DAYS.free],
  ["Pro", PLAN_RETENTION_DAYS.pro],
  ["Team", PLAN_RETENTION_DAYS.team],
] as const;
