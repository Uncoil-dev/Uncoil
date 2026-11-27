/**
 * Groups traces into topics by what they were asked to do, with no AI key needed: each trace's first input is
 * normalized (ids, emails, links, numbers and quoted values replaced), turned into TF-IDF word weights and joined to
 * the most similar existing topic, or starts a new one. Topics are named from their strongest words. Pure functions
 * only, so the same traces always give the same topics.
 */

import { errorSignature } from "./trace-diff.ts";

/** `output` is the final output when known; an empty string or null on a trace without an error marks a silent failure. */
export type TopicTrace = {
  runId: string; input: string; hasError: boolean; timedOut?: boolean; errorMessage?: string; output?: string | null;
};
export type TopicOutcome = { succeeded: number; failed: number; timedOut: number };
export type TopicIssue = { id: string; message: string; count: number };
export type TraceTopic = {
  id: string; name: string; terms: string[]; count: number; errorRate: number; sampleRunIds: string[]; runIds: string[];
  outcome: TopicOutcome; issues: TopicIssue[]; silentFailures: number;
};
export type TopicOptions = { threshold?: number; minSize?: number; samples?: number };

const STOPWORDS = new Set(("the and for you your are was were with that this have has had not but can could would should "
  + "will just from what when where which who how why all any some more most very into onto about over than then them "
  + "they their there here its please want need like make get got let me my mine our ours we us "
  + "him her his hers she he of to in on at by is be am an a or as do does did so if it no yes ok okay hi hello thanks thank "
  + "don't didn't doesn't isn't wasn't won't can't couldn't wouldn't shouldn't i've you're they're that's what's")
  .split(" ").map((word) => word.replace(/'/g, "")));

export function normalizeTopicText(value: string) {
  return String(value ?? "").slice(0, 2000).toLowerCase()
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"<>]+/g, "<url>")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g, "<email>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>")
    .replace(/"[^"]*"|(^|[^\p{L}])'[^'\s][^']*'/gu, "$1<value>")
    .replace(/\b[0-9a-f]*[0-9][0-9a-f]{7,}\b/g, "<id>")
    .replace(/[0-9]+(\.[0-9]+)?/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string) {
  const out: string[] = [];
  for (const word of text.replace(/<[a-z]+>/g, " ").replace(/['’]/g, "").split(/[^\p{L}]+/u)) {
    const latin = /^[a-z]+$/.test(word);
    if (word.length < (latin ? 3 : 2) || STOPWORDS.has(word)) continue;
    out.push(latin && word.length > 4 && word.endsWith("s") && !/(ss|us|is)$/.test(word) ? word.slice(0, -1) : word);
  }
  return out;
}

type Vector = Map<string, number>;

function norm(v: Vector) {
  let sum = 0;
  for (const x of v.values()) sum += x * x;
  return Math.sqrt(sum);
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Every trace lands in exactly one outcome bucket (timed out, then failed, then succeeded). Issues are the three most
// common error groups, using the same message normalization as the run comparison; ties sort by message.
function summarize(traces: TopicTrace[]) {
  const outcome: TopicOutcome = { succeeded: 0, failed: 0, timedOut: 0 };
  const groups = new Map<string, TopicIssue>();
  let silentFailures = 0;
  for (const trace of traces) {
    if (trace.timedOut) outcome.timedOut++;
    else if (trace.hasError) outcome.failed++;
    else outcome.succeeded++;
    if (trace.hasError) {
      const message = errorSignature({ errorMessage: trace.errorMessage }).message;
      const issue = groups.get(message) ?? { id: hash(message), message, count: 0 };
      issue.count++;
      groups.set(message, issue);
    } else if (!trace.timedOut && trace.output !== undefined && (trace.output === null || String(trace.output).trim() === "")) {
      silentFailures++;
    }
  }
  const issues = [...groups.values()].sort((a, b) => b.count - a.count || (a.message < b.message ? -1 : a.message > b.message ? 1 : 0)).slice(0, 3);
  return { outcome, issues, silentFailures };
}

export function groupTraceTopics(traces: TopicTrace[], options: TopicOptions = {}) {
  const threshold = options.threshold ?? 0.35;
  const minSize = options.minSize ?? 3;
  const samples = options.samples ?? 5;

  // Sorting first makes the result independent of the order traces arrive in.
  // Code-point order (not locale order) so every environment gives the same topics.
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const all = traces
    .map((trace) => ({ trace, words: tokens(normalizeTopicText(trace.input)) }))
    .map((doc) => ({ ...doc, key: doc.words.join(" ") }))
    .sort((a, b) => cmp(a.key, b.key) || cmp(a.trace.runId, b.trace.runId));
  // Traces with no usable words still count; they land in "Other".
  const docs = all.filter((doc) => doc.words.length > 0);
  const leftovers = all.filter((doc) => doc.words.length === 0 && String(doc.trace.input ?? "").trim() !== "");
  if (docs.length === 0 && leftovers.length === 0) return { total: 0, topics: [] as TraceTopic[] };

  const df = new Map<string, number>();
  for (const doc of docs) for (const word of new Set(doc.words)) df.set(word, (df.get(word) ?? 0) + 1);
  const idf = (word: string) => Math.log(1 + docs.length / (df.get(word) ?? 1));

  const groups: { centroid: Vector; norm: number; members: typeof docs }[] = [];
  for (const doc of docs) {
    const vector: Vector = new Map();
    for (const word of doc.words) vector.set(word, (vector.get(word) ?? 0) + idf(word));
    const length = norm(vector);
    let best = -1;
    let bestScore = threshold;
    for (let i = 0; i < groups.length; i++) {
      let dot = 0;
      for (const [word, weight] of vector) dot += weight * (groups[i].centroid.get(word) ?? 0);
      const score = dot / (length * groups[i].norm || 1);
      if (score >= bestScore) { best = i; bestScore = score; }
    }
    if (best === -1) { groups.push({ centroid: new Map(), norm: 0, members: [] }); best = groups.length - 1; }
    const group = groups[best];
    for (const [word, weight] of vector) group.centroid.set(word, (group.centroid.get(word) ?? 0) + weight / length);
    group.norm = norm(group.centroid);
    group.members.push(doc);
  }

  const toTopic = (id: string, name: string, terms: string[], members: typeof docs): TraceTopic => {
    const runIds = members.map((m) => m.trace.runId);
    const failed = members.filter((m) => m.trace.hasError || m.trace.timedOut).length;
    return {
      id, name, terms, count: members.length, errorRate: failed / members.length, sampleRunIds: runIds.slice(0, samples), runIds,
      ...summarize(members.map((m) => m.trace)),
    };
  };

  const topics: TraceTopic[] = [];
  const seen = new Map<string, number>();
  for (const group of groups) {
    if (group.members.length < minSize) { leftovers.push(...group.members); continue; }
    const terms = [...group.centroid].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 3).map(([w]) => w);
    const base = hash([...terms].sort().join(" "));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    topics.push(toTopic(n ? `${base}-${n}` : base, terms.join(" · "), terms, group.members));
  }
  topics.sort((a, b) => b.count - a.count || cmp(a.id, b.id));
  if (leftovers.length) topics.push(toTopic("other", "Other", [], leftovers));
  return { total: docs.length + leftovers.length, topics };
}

/** Topic ids are an 8-digit hash (with a `-n` suffix on a repeat) or `other`. */
export function isTopicId(value: string) {
  return /^([0-9a-f]{8}(-\d+)?|other)$/.test(value);
}

/** Run ids of one topic, or none for an unknown id. Uses the same grouping as the topics list, so counts agree. */
export function topicRunIds(traces: TopicTrace[], topicId: string, options: TopicOptions = {}) {
  return groupTraceTopics(traces, options).topics.find((topic) => topic.id === topicId)?.runIds ?? [];
}
