import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveCaptureContent, stripFeedbackContent, stripSpanContent } from "./privacy";

export interface UncoilConfig {
  apiKey?: string;
  host?: string;
  /** Uncoil Cloud data region. Ignored when `host` is provided. Defaults to UNCOIL_REGION, then the API key's region, then EU. */
  region?: UncoilRegion;
  projectId?: string;
  /** Release and environment are copied onto observations created by this client. */
  release?: string;
  environment?: string;
  deploymentId?: string;
  sessionId?: string;
  endUserId?: string;
  tags?: string[];
  /**
   * Share of runs to record, from 0 (none) to 1 (all, the default). The choice is made per run, so a kept
   * run is always complete and a dropped run leaves nothing behind. Spans that report an error are still
   * kept unless `keepErrors` is false.
   */
  sampleRate?: number;
  /** Keep spans that report an error even when their run was not sampled. Defaults to true. */
  keepErrors?: boolean;
  /** Extra clean-up of prompts and answers before they leave your app. Secret removal always runs, and emails, phone numbers and card numbers are masked unless you set `pii: false`. */
  redact?: RedactionOptions;
  /** Called instead of printing a warning when the SDK has a problem sending data. */
  onError?: (error: UncoilError) => void;
  /**
   * Print one line with a link to the run when a traced run fails. On by default, except when
   * NODE_ENV or `environment` is "production".
   */
  failureLinks?: boolean;
  /** Send prompts, outputs, tool data, error messages and feedback text. Defaults to true unless UNCOIL_CAPTURE_CONTENT is false, 0, no or off. */
  captureContent?: boolean;
}

export interface RedactionOptions {
  /** Mask emails, phone numbers and card numbers. On by default; set to false to send them as they are. */
  pii?: boolean;
  /** Extra patterns to mask. Strings are matched as plain text. */
  patterns?: Array<RegExp | string>;
  /** Your own last-step cleaner; its result is what gets sent. */
  fn?: (text: string) => string;
  /** What masked text is replaced with. Defaults to "[redacted]". */
  replacement?: string;
}

/** A problem the SDK ran into, with a plain-language fix in `hint`. */
export class UncoilError extends Error {
  readonly code: string;
  readonly hint: string;
  readonly status?: number;
  constructor(code: string, message: string, hint: string, status?: number) {
    super(`${message} ${hint}`);
    this.name = "UncoilError";
    this.code = code;
    this.hint = hint;
    this.status = status;
  }
}

function promptError(name: string, environment: string, status: number, reason?: string) {
  if (status === 401) return new UncoilError("bad_key", "Uncoil rejected the API key while resolving a prompt (401).", "Check UNCOIL_API_KEY, or create a new key on the API keys page if this one was revoked.", status);
  if (status === 404) return new UncoilError("prompt_not_found", `Prompt "${name}" has no version deployed to "${environment}" (404).`, "Check that the prompt name and environment label exist on the Prompts page.", status);
  return new UncoilError("prompt_failed", `Prompt resolution failed (${status})${reason ? `: ${reason}` : ""}.`, "Try again shortly; if it keeps happening, check the status page.", status);
}

export type UncoilRegion = "eu" | "us";

export const UNCOIL_REGION_HOSTS: Record<UncoilRegion, string> = {
  eu: "https://eu.cloud.uncoil.dev",
  us: "https://us.cloud.uncoil.dev",
};

function parseRegion(value: string | undefined): UncoilRegion | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized === "eu" || normalized === "us" ? normalized : undefined;
}

function apiKeyRegion(apiKey: string): UncoilRegion | undefined {
  if (/^(uncoil|tracify)_sk_live_eu_/.test(apiKey)) return "eu";
  if (/^(uncoil|tracify)_sk_live_us_/.test(apiKey)) return "us";
  if (/^(uncoil|tracify)_sk_live_/.test(apiKey)) return "eu";
  return undefined;
}

export interface SpanData {
  spanId?: string;
  runId?: string;
  spanType: string;
  input?: any;
  output?: any;
  latencyMs?: number;
  costUsd?: number;
  modelId?: string;
  toolName?: string;
  metadata?: Record<string, any>;
  parentSpanId?: string;
  sessionId?: string;
  endUserId?: string;
  deploymentId?: string;
  environment?: string;
  release?: string;
  tags?: string[];
  traceName?: string;
  inputTokens?: number;
  outputTokens?: number;
  ttftMs?: number;
  retryCount?: number;
  errorType?: string;
  errorMessage?: string;
  isStreamChunk?: boolean;
  streamSequence?: number;
  streamFinal?: boolean;
  payloadFormat?: string;
  createdAt?: string;
  promptVersionId?: string;
}

export interface PromptResolution {
  prompt: { id: string; name: string; description?: string; type: "text" | "chat" };
  version: { id: string; version: number; content: string; variables: string[]; labels: string[]; model?: string; createdAt: number };
}

export interface PromptResolutionOptions {
  cacheTtlMs?: number;
  fallback?: PromptResolution;
}

export interface RuntimePolicy {
  enforcementMode: "observe" | "enforce";
  maxCostPerRun?: number;
  maxCostPerDay?: number;
  fallbackChain: string[];
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };
  latencyBudgetMs?: number;
}

export interface OrchestrateOptions<T> {
  policy: RuntimePolicy;
  call: (model: string, signal: AbortSignal) => Promise<T>;
  model: string;
  input?: any;
  calculateCost?: (result: T, model: string) => number;
  runId?: string;
}

/**
 * The current run and step for this async call chain. AsyncLocalStorage keeps concurrent runs apart, so steps
 * from two agents running at once never land in each other's trace.
 */
const stepContext = new AsyncLocalStorage<{ runId: string; spanId?: string; traceName?: string; client?: UncoilClient }>();

export function currentRunId() {
  return stepContext.getStore()?.runId || (process.env.UNCOIL_CURRENT_RUN_ID ?? process.env.TRACIFY_CURRENT_RUN_ID) || 'unknown';
}

export function currentTraceContext() { return stepContext.getStore(); }
export function integrationPayload(value: unknown) { return payload(value); }

export function currentSpanId() {
  return stepContext.getStore()?.spanId;
}

export const MAX_PAYLOAD_CHARS = 10_000;
const SECRET_PATTERNS: RegExp[] = [
  /\bbearer\s+[a-z0-9._~+/=-]{12,}/gi,
  /\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];
const SECRET_FIELD = /((?:api[_-]?key|password|secret|token)["']?\s*[:=]\s*["']?)[^\s"',}]{6,}/gi;

/** Serialise an input or output, remove obvious secrets and cap its size. */
function payload(value: unknown): string {
  if (value === undefined || value === null) return '';
  let text: string;
  if (typeof value === 'string') text = value;
  else {
    try { text = JSON.stringify(value); } catch { text = String(value); }
  }
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[redacted]');
  text = text.replace(SECRET_FIELD, '$1[redacted]');
  return text.length > MAX_PAYLOAD_CHARS ? `${text.slice(0, MAX_PAYLOAD_CHARS)}… [truncated ${text.length - MAX_PAYLOAD_CHARS} chars]` : text;
}

const PII_PATTERNS: RegExp[] = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  /(?<![\w.])\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
];

const CARD_NUMBER = /\b(?:\d[ -]?){13,19}\b/g;

/** Card-number check, so long ids and timestamps are left alone. */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Build the clean-up for `redact`. Emails, phone numbers and card numbers are masked unless `pii: false`. */
export function buildRedactor(options?: RedactionOptions): ((text: string) => string) | undefined {
  const replacement = options?.replacement ?? "[redacted]";
  const patterns: RegExp[] = [];
  const maskPii = options?.pii !== false;
  if (maskPii) patterns.push(...PII_PATTERNS);
  if (!options) options = {};
  for (const pattern of options.patterns ?? []) {
    if (typeof pattern === "string") {
      if (pattern) patterns.push(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    } else patterns.push(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));
  }
  if (!patterns.length && !maskPii && !options.fn) return undefined;
  return (text: string) => {
    if (maskPii) text = text.replace(CARD_NUMBER, (m) => { const d = m.replace(/\D/g, ""); return d.length >= 13 && passesLuhn(d) ? replacement + m.slice(m.search(/[ -]*$/)) : m; });
    for (const pattern of patterns) text = text.replace(pattern, replacement);
    return options!.fn ? options.fn(text) : text;
  };
}

/** Stable number in [0, 1) for a run id, so every span of a run gets the same sampling decision. */
export function sampleBucket(runId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < runId.length; i++) {
    hash ^= runId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `span_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/** Longest an ingest, feedback or score request may take, so a hung network cannot hold sockets open. */
const REQUEST_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return false; // AbortError is never retryable
  const msg = error.message.toLowerCase();
  const name = (error as any).name?.toLowerCase?.() ?? "";
  const status = (error as any).status ?? (error as any).statusCode ?? 0;

  for (const code of retryableErrors) {
    switch (code) {
      case "timeout":
        if (msg.includes("timeout") || msg.includes("timed out") || name === "timeouterror") return true;
        break;
      case "5xx":
        if (status >= 500 && status < 600) return true;
        break;
      case "429":
        if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests")) return true;
        break;
      case "rate_limit":
        if (status === 429 || msg.includes("rate limit") || msg.includes("throttl")) return true;
        break;
      case "overloaded":
        if (msg.includes("overloaded") || msg.includes("capacity") || msg.includes("busy")) return true;
        break;
    }
  }
  return false;
}

/** True when .env.local in the working folder sets UNCOIL_API_KEY; `login` saves the key there, but plain Node does not read the file. */
function envLocalSetsKey(): boolean {
  try {
    return /^\s*(?:export\s+)?UNCOIL_API_KEY\s*=\s*\S/m.test(readFileSync(resolve(process.cwd(), ".env.local"), "utf8"));
  } catch {
    return false;
  }
}

const pendingSends = new Set<Promise<unknown>>();

async function waitFor(sends: Set<Promise<unknown>>, timeoutMs: number): Promise<boolean> {
  if (sends.size === 0) return true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); });
  try {
    return await Promise.race([Promise.allSettled([...sends]).then(() => true), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wait until every span sent by any Uncoil client so far has finished sending.
 * Call it before a short script or serverless request handler returns.
 * Resolves to false if sends are still in flight after `timeoutMs`.
 */
export function flush(timeoutMs = 5_000): Promise<boolean> {
  return waitFor(pendingSends, timeoutMs);
}

function isLatencyAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export class UncoilClient {
  protected apiKey: string;
  protected host: string;
  protected ingestUrl: string;
  protected projectId?: string;
  private checkCostUrl: string;
  private _lastFailOpen: boolean = false;
  private promptCache = new Map<string, { value: PromptResolution; expiresAt: number }>();
  private release?: string;
  private environment?: string;
  private deploymentId?: string;
  private sessionId?: string;
  private endUserId?: string;
  private tags?: string[];
  private sampleRate = 1;
  private keepErrors = true;
  private redactor?: (text: string) => string;
  private onError?: (error: UncoilError) => void;
  private warned = new Set<string>();
  private failureLinks: boolean;
  private captureContent: boolean;
  private pending = new Set<Promise<unknown>>();

  constructor(config: UncoilConfig = {}) {
    this.apiKey = (config.apiKey || (process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY) || '').trim();
    this.onError = config.onError;
    this.captureContent = resolveCaptureContent(config.captureContent);
    if (config.sampleRate !== undefined && !(config.sampleRate >= 0 && config.sampleRate <= 1)) {
      throw new UncoilError("bad_sample_rate", `sampleRate must be a number from 0 to 1, but got ${String(config.sampleRate)}.`, "Use 1 to record every run, 0.1 to record about one in ten.");
    }
    this.sampleRate = config.sampleRate ?? 1;
    this.keepErrors = config.keepErrors ?? true;
    this.redactor = buildRedactor(config.redact);
    if (!this.apiKey) {
      const hint = envLocalSetsKey()
        ? "Your .env.local sets UNCOIL_API_KEY, but this app did not load it. Run it with node --env-file=.env.local (for example node --env-file=.env.local app.js), or load the file with dotenv."
        : "Pass { apiKey } to the client or set the UNCOIL_API_KEY environment variable. You can create a key on the API keys page of your dashboard.";
      this.report(new UncoilError("missing_key", "No Uncoil API key was found, so nothing will be recorded.", hint));
    } else if (!/^(uncoil|tracify)_sk_/.test(this.apiKey)) {
      this.report(new UncoilError("odd_key", "That API key does not look like an Uncoil key (they start with uncoil_sk_).", "Copy the key again from the API keys page of your dashboard; make sure no other service's key was pasted by mistake."));
    }
    // With no region set, the key's own region picks the host, so a US key works without extra config.
    const keyRegion = apiKeyRegion(this.apiKey);
    const configuredRegion = config.region ?? parseRegion((process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION)) ?? keyRegion ?? "eu";
    this.host = (config.host || (process.env.UNCOIL_HOST ?? process.env.TRACIFY_HOST) || UNCOIL_REGION_HOSTS[configuredRegion]).replace(/\/$/, '');
    const selectedHostRegion = Object.entries(UNCOIL_REGION_HOSTS).find(([, host]) => host === this.host)?.[0] as UncoilRegion | undefined;
    if (keyRegion && selectedHostRegion && keyRegion !== selectedHostRegion) {
      throw new UncoilError("region_mismatch", `Uncoil API key region mismatch: this key belongs to ${keyRegion.toUpperCase()}, but the client is configured for ${selectedHostRegion.toUpperCase()}.`, `Set region: "${keyRegion}" (or UNCOIL_REGION=${keyRegion}), or create a key in the ${selectedHostRegion.toUpperCase()} region.`);
    }
    this.projectId = config.projectId;
    this.release = config.release;
    this.environment = config.environment;
    this.deploymentId = config.deploymentId;
    this.sessionId = config.sessionId;
    this.endUserId = config.endUserId;
    this.tags = config.tags;
    this.failureLinks = config.failureLinks ?? (process.env.NODE_ENV !== 'production' && config.environment !== 'production');
    try { new URL(this.host); } catch {
      throw new UncoilError("bad_host", `The host "${this.host}" is not a valid web address.`, 'Use a full address such as "https://eu.cloud.uncoil.dev", or drop the host option and use region: "eu" or "us".');
    }
    this.ingestUrl = `${this.host}/api/ingest`;
    this.checkCostUrl = `${this.host}/api/orchestration/check-cost`;
  }

  private clean(value: unknown) {
    const text = payload(value);
    return this.redactor && text ? this.redactor(text) : text;
  }

  /** Tell the app about a problem once per kind: through `onError` if given, otherwise as a console warning. */
  private report(error: UncoilError) {
    if (this.warned.has(error.code)) return;
    this.warned.add(error.code);
    if (this.onError) {
      try { this.onError(error); } catch { /* a faulty handler must never break the app */ }
    } else console.warn(`Uncoil Warning: ${error.message}`);
  }

  /** Prints where a run failed, with a link to it when the project is known. Internal: called by root steps. */
  announceFailedRun(runId: string, stepName: string) {
    if (!this.failureLinks || !this.apiKey) return;
    const project = this.projectId || (process.env.UNCOIL_PROJECT_ID ?? '').trim();
    const where = project ? ` -> ${this.host}/dashboard/${encodeURIComponent(project)}/tracing/${encodeURIComponent(runId)}` : ` (run ${runId})`;
    console.warn(`Uncoil: run failed at step "${stepName}"${where}`);
  }

  /** True when this span should be dropped by sampling. */
  private sampledOut(runId: string, data: SpanData) {
    if (this.sampleRate >= 1) return false;
    if (this.keepErrors && (data.errorType || data.errorMessage)) return false;
    return sampleBucket(runId) >= this.sampleRate;
  }

  /** A 429 with a plan or daily limit code means the project ran out of spans, which a lower sampleRate does not fix. */
  private async reportPlanLimit(response: Response) {
    const body = await response.json().catch(() => null) as { code?: string; limit?: number; retryAfterSeconds?: number; upgradeUrl?: string } | null;
    if (body?.code !== "plan_limit_reached" && body?.code !== "daily_limit_reached") return false;
    const period = body.code === "daily_limit_reached" ? "daily" : "monthly";
    const limit = typeof body.limit === "number" ? ` of ${body.limit.toLocaleString("en-US")} spans` : "";
    const resets = typeof body.retryAfterSeconds === "number" ? `from ${new Date(Date.now() + body.retryAfterSeconds * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC` : `when the ${period === "daily" ? "day" : "month"} resets`;
    const upgradeUrl = body.upgradeUrl || "https://www.uncoil.dev/pricing";
    this.report(new UncoilError(body.code, `This project reached its ${period} plan limit${limit}, so new spans are not saved (429).`, `Data is saved again ${resets}. To keep recording now, upgrade the plan: ${upgradeUrl}`, 429));
    return true;
  }

  private async checkIngestResponse(response: Response) {
    if (response.ok) return;
    const status = response.status;
    // 4xx bodies carry `{ error }` saying what was wrong with the span; show it so the fix is obvious.
    // Read a clone so later handlers can still read the body.
    const body: { error?: unknown; code?: unknown } | undefined = status >= 400 && status < 500
      ? await response.clone().json().catch(() => undefined)
      : undefined;
    const reason = typeof body?.error === "string" && body.error ? `: ${body.error}` : "";
    // The ingest route pauses a key after repeated rate-limit errors and says so with code "key_paused".
    if (status === 403 && body?.code === "key_paused") this.report(new UncoilError("key_paused", "This API key was paused after repeated rate-limit errors (403).", "Create a new key on the API keys page of your dashboard and update UNCOIL_API_KEY.", status));
    else if (status === 401) this.report(new UncoilError("bad_key", "Uncoil rejected the API key (401).", "The key is wrong, was revoked, or belongs to another region. Check UNCOIL_API_KEY and UNCOIL_REGION.", status));
    else if (status === 402) this.report(new UncoilError("plan_limit", "Your Uncoil plan's limit has been reached, so new spans are not being recorded (402).", "Check usage on the billing page and upgrade your plan, or wait for the limit to reset.", status));
    else if (status === 403) this.report(new UncoilError("forbidden", `This API key is not allowed to send data (403${reason}).`, "Check that the key belongs to the project you expect and has not been disabled.", status));
    else if (status === 429 && (await this.reportPlanLimit(response))) return;
    else if (status === 429) this.report(new UncoilError("rate_limited", "Uncoil is receiving too much data from this app (429).", "Lower the volume with sampleRate (for example 0.2), or upgrade your plan.", status));
    else if (status >= 500) this.report(new UncoilError("server_error", `Uncoil had a problem on its side (${status}).`, "Your app is not affected; data from this moment may be missing. Check the status page if it keeps happening.", status));
    else this.report(new UncoilError("rejected", `Uncoil did not accept a span (${status}${reason}).`, "Update the SDK to the latest version; if it still happens, contact support.", status));
  }

  async ingest(data: SpanData) {
    if (!this.apiKey) return;

    const context = stepContext.getStore();
    const spanId = data.spanId || createId();
    if (this.sampledOut(data.runId || currentRunId(), data)) return;
    const parentSpanId = data.parentSpanId || (context?.spanId && context.spanId !== spanId ? context.spanId : undefined);
    const built = {
      ...data,
      spanId,
      runId: data.runId || currentRunId(),
      traceName: data.traceName ?? context?.traceName,
      parentSpanId,
      createdAt: data.createdAt || new Date().toISOString(),
      metadata: data.metadata || {},
      input: this.captureContent ? this.clean(data.input) : '',
      output: this.captureContent ? this.clean(data.output) : '',
      release: data.release ?? this.release,
      environment: data.environment ?? this.environment,
      deploymentId: data.deploymentId ?? data.metadata?.deploymentId ?? this.deploymentId,
      sessionId: data.sessionId ?? this.sessionId,
      endUserId: data.endUserId ?? this.endUserId,
      tags: data.tags ?? this.tags,
    };
    const span = this.captureContent ? built : stripSpanContent(built);

    try {
      const doFetch = () => fetch(this.ingestUrl, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(span),
      });
      const send = doFetch().then(async (response) => {
        // A 503 means storage is briefly unavailable and the route asks for a retry: try once more after Retry-After (at most 5s).
        if (response.status === 503) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
          await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : 1, 5) * 1000);
          response = await doFetch();
        }
        return this.checkIngestResponse(response);
      }).catch((err) => this.report(new UncoilError("network", `Could not reach Uncoil (${err?.message ?? err}).`, "Check your internet connection and the host setting. Your app keeps running; these spans are dropped.")));
      this.pending.add(send);
      pendingSends.add(send);
      send.finally(() => { this.pending.delete(send); pendingSends.delete(send); });
    } catch {
      // Ignore errors in telemetry
    }
  }

  /**
   * Wait until the spans this client has sent have finished sending.
   * Resolves to false if sends are still in flight after `timeoutMs`.
   */
  flush(timeoutMs = 5_000): Promise<boolean> {
    return waitFor(this.pending, timeoutMs);
  }

  /** Resolve a prompt version labeled for an environment without redeploying application code. */
  async getPrompt(name: string, environment = "production", options: PromptResolutionOptions = {}): Promise<PromptResolution> {
    if (!this.apiKey) throw new UncoilError("missing_key", "An Uncoil API key is required to resolve prompts.", "Set UNCOIL_API_KEY or pass apiKey to UncoilClient.");
    const key = `${name}:${environment}`;
    const cached = this.promptCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    try {
      const response = await fetch(`${this.host}/api/prompts/${encodeURIComponent(name)}?environment=${encodeURIComponent(environment)}`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw promptError(name, environment, response.status, data?.error);
      const value = data as PromptResolution;
      this.promptCache.set(key, { value, expiresAt: Date.now() + (options.cacheTtlMs ?? 60_000) });
      return value;
    } catch (error) {
      if (cached) return cached.value;
      if (options.fallback) return options.fallback;
      throw error;
    }
  }

  private feedbackBody<T extends object>(body: T): T {
    return this.captureContent ? body : stripFeedbackContent(body);
  }

  /** Attach end-user feedback to a trace or span. The request is fire-and-forget like span ingestion. */
  feedback(traceId: string, value: boolean | number | string, options: { kind?: 'thumb' | 'star' | 'text'; spanId?: string; reason?: string; comment?: string; endUserId?: string; dedupeKey?: string; projectId?: string } = {}) {
    if (!this.apiKey || !(options.projectId || this.projectId)) return;
    fetch(`${this.host}/api/feedback`, { method: 'POST', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(this.feedbackBody({ projectId: options.projectId || this.projectId, traceId, spanId: options.spanId, kind: options.kind || (typeof value === 'number' ? 'star' : typeof value === 'boolean' ? 'thumb' : 'text'), value, reason: options.reason, comment: options.comment, endUserId: options.endUserId, dedupeKey: options.dedupeKey })) }).catch((error) => console.warn('Uncoil Warning: Failed to record feedback:', error));
  }

  /** Attach a typed score to a trace or span through the feedback API. */
  score(traceId: string, name: string, value: boolean | number | string, options: { dataType?: 'numeric' | 'boolean' | 'categorical' | 'text'; spanId?: string; comment?: string; projectId?: string } = {}) {
    if (!this.apiKey || !(options.projectId || this.projectId)) return;
    fetch(`${this.host}/api/feedback`, { method: 'POST', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(this.feedbackBody({ projectId: options.projectId || this.projectId, traceId, spanId: options.spanId, kind: 'text', name, value, dataType: options.dataType, comment: options.comment })) }).catch((error) => console.warn('Uncoil Warning: Failed to record score:', error));
  }

  /**
   * Server-side cost check. Returns the server's decision on whether
   * the next call would exceed the ceiling.
   */
  private async checkCost(runId: string, incrementUsd: number): Promise<{
    allowed: boolean;
    reason?: string;
    currentCost?: number;
    ceiling?: number;
  }> {
    try {
      const res = await fetch(this.checkCostUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId, incrementUsd }),
      });

      if (!res.ok) {
        this._lastFailOpen = true;
        return { allowed: true, reason: "check_failed" };
      }

      this._lastFailOpen = false;
      return await res.json();
    } catch {
      this._lastFailOpen = true;
      return { allowed: true, reason: "network_error" };
    }
  }

  async orchestrate<T>(options: OrchestrateOptions<T>): Promise<T> {
    const { policy, call, model, input, calculateCost, runId: explicitRunId } = options;
    const runId = explicitRunId || stepContext.getStore()?.runId || (process.env.UNCOIL_CURRENT_RUN_ID ?? process.env.TRACIFY_CURRENT_RUN_ID) || createId();
    const allModels = [model, ...policy.fallbackChain.filter((m) => m !== model)];

    let lastError: unknown = null;

    for (let modelIndex = 0; modelIndex < allModels.length; modelIndex++) {
      const currentModel = allModels[modelIndex];
      const isFallback = modelIndex > 0;
      const fallbackReason = isFallback
        ? lastError
          ? isLatencyAbort(lastError) ? "latency_budget" : "provider_error"
          : "cost_ceiling"
        : undefined;

      const maxAttempts = isFallback ? 1 : (policy.retryPolicy.maxAttempts + 1);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const spanId = createId();
        const startTime = Date.now();

        // Server-side cost ceiling enforcement (shared across all instances)
        if (policy.enforcementMode === "enforce") {
          const estimatedCost = calculateCost ? 0.01 : 0; // Estimate before call; actual cost reported after

          if (policy.maxCostPerRun !== undefined) {
            const check = await this.checkCost(runId, estimatedCost);
            if (!check.allowed && check.reason === "maxCostPerRun") {
              this.ingest({
                spanId,
                runId,
                spanType: "llm_call",
                input,
                output: JSON.stringify({ blocked: true, reason: "cost_ceiling" }),
                modelId: currentModel,
                costUsd: 0,
                latencyMs: 0,
                metadata: {
                  orchestrationBlocked: true,
                  orchestrationReason: "cost_ceiling",
                  orchestrationAttempt: attempt,
                  orchestrationModel: currentModel,
                  orchestrationOriginalModel: model,
                  orchestrationServerCost: check.currentCost,
                  orchestrationCeiling: check.ceiling,
                  orchestrationFailOpen: this._lastFailOpen,
                  orchestrationPolicy: JSON.stringify(policy),
                },
              });
              if (modelIndex < allModels.length - 1) {
                lastError = new Error(`Cost ceiling reached: $${check.currentCost?.toFixed(4)} >= $${check.ceiling}`);
                break;
              }
              throw new Error(`Cost ceiling reached: $${check.currentCost?.toFixed(4)} >= $${check.ceiling}`);
            }
          }

          if (policy.maxCostPerDay !== undefined) {
            const check = await this.checkCost(runId, estimatedCost);
            if (!check.allowed && check.reason === "maxCostPerDay") {
              this.ingest({
                spanId,
                runId,
                spanType: "llm_call",
                input,
                output: JSON.stringify({ blocked: true, reason: "daily_cost_ceiling" }),
                modelId: currentModel,
                costUsd: 0,
                latencyMs: 0,
                metadata: {
                  orchestrationBlocked: true,
                  orchestrationReason: "daily_cost_ceiling",
                  orchestrationAttempt: attempt,
                  orchestrationModel: currentModel,
                  orchestrationOriginalModel: model,
                  orchestrationServerCost: check.currentCost,
                  orchestrationCeiling: check.ceiling,
                  orchestrationFailOpen: this._lastFailOpen,
                  orchestrationPolicy: JSON.stringify(policy),
                },
              });
              if (modelIndex < allModels.length - 1) {
                lastError = new Error(`Daily cost ceiling reached: $${check.currentCost?.toFixed(4)} >= $${check.ceiling}`);
                break;
              }
              throw new Error(`Daily cost ceiling reached: $${check.currentCost?.toFixed(4)} >= $${check.ceiling}`);
            }
          }
        }

        // Latency budget enforcement via AbortController
        const controller = new AbortController();
        let latencyTimer: ReturnType<typeof setTimeout> | undefined;

        if (policy.latencyBudgetMs !== undefined && policy.enforcementMode === "enforce") {
          latencyTimer = setTimeout(() => controller.abort(), policy.latencyBudgetMs);
        }

        try {
          const result = await call(currentModel, controller.signal);
          const latencyMs = Date.now() - startTime;
          const costUsd = calculateCost ? calculateCost(result, currentModel) : 0;

          if (latencyTimer) clearTimeout(latencyTimer);

          // Report actual cost to server
          if (policy.enforcementMode === "enforce" && costUsd > 0) {
            await this.checkCost(runId, costUsd);
          }

          this.ingest({
            spanId,
            runId,
            spanType: "llm_call",
            input,
            output: result,
            modelId: currentModel,
            costUsd,
            latencyMs,
            metadata: {
              orchestrationAttempt: attempt,
              orchestrationModel: currentModel,
              orchestrationOriginalModel: model,
              orchestrationIsFallback: isFallback,
              orchestrationFallbackReason: fallbackReason ?? null,
              orchestrationFinal: true,
              orchestrationFailOpen: this._lastFailOpen,
              orchestrationPolicy: JSON.stringify(policy),
            },
          });

          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          if (latencyTimer) clearTimeout(latencyTimer);
          lastError = error;

          const retryable = isRetryableError(error, policy.retryPolicy.retryableErrors);
          const isLastAttempt = attempt === maxAttempts;
          const wasLatencyAbort = isLatencyAbort(error);

          this.ingest({
            spanId,
            runId,
            spanType: retryable && !isLastAttempt ? "llm_call" : "error",
            input,
            output: error instanceof Error ? error.message : String(error),
            modelId: currentModel,
            costUsd: 0,
            latencyMs,
            metadata: {
              orchestrationAttempt: attempt,
              orchestrationModel: currentModel,
              orchestrationOriginalModel: model,
              orchestrationIsFallback: isFallback,
              orchestrationFallbackReason: fallbackReason ?? null,
              orchestrationError: true,
              orchestrationLatencyAbort: wasLatencyAbort,
              orchestrationRetryable: retryable,
              orchestrationWillRetry: retryable && !isLastAttempt,
              orchestrationFailOpen: this._lastFailOpen,
              orchestrationPolicy: JSON.stringify(policy),
            },
          });

          if (retryable && !isLastAttempt) {
            const delay = policy.retryPolicy.backoffMs * Math.pow(policy.retryPolicy.backoffMultiplier, attempt - 1);
            await sleep(delay);
            continue;
          }

          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("All fallback models exhausted");
  }
}


export type StepType = 'agent' | 'llm' | 'tool' | 'retrieval' | 'span' | (string & {});

/** A step in progress. Set its output and anything it measured before it ends. */
export class Step {
  readonly id = createId();
  output: unknown;
  metadata: Record<string, any>;
  fields: Partial<Pick<SpanData, 'modelId' | 'inputTokens' | 'outputTokens' | 'costUsd'>> = {};

  constructor(readonly name: string, readonly type: StepType, readonly input?: unknown, metadata?: Record<string, any>) {
    this.metadata = { ...(metadata ?? {}) };
  }

  setOutput(output: unknown) {
    this.output = output;
    return this;
  }

  /** Record what the step measured; anything not listed goes into metadata. */
  set({ model, inputTokens, outputTokens, costUsd, ...metadata }: { model?: string; inputTokens?: number; outputTokens?: number; costUsd?: number; [key: string]: any }) {
    if (model !== undefined) this.fields.modelId = model;
    if (inputTokens !== undefined) this.fields.inputTokens = inputTokens;
    if (outputTokens !== undefined) this.fields.outputTokens = outputTokens;
    if (costUsd !== undefined) this.fields.costUsd = costUsd;
    Object.assign(this.metadata, metadata);
    return this;
  }
}

export interface StepOptions {
  type?: StepType;
  input?: unknown;
  metadata?: Record<string, any>;
  client?: UncoilClient;
  /** Start a new run with this id (used by traceAgent). */
  runId?: string;
  /** Send this step as the run's end (run_end or error), which marks the run completed or failed. */
  root?: boolean;
}

let defaultClientInstance: UncoilClient | undefined;
/** The shared client used when no client is passed and no trace is active, so setup warnings print once. */
export function defaultClient() {
  return (defaultClientInstance ??= new UncoilClient());
}

/**
 * Record one step of the agent. Steps started inside `fn` become its children, so the trace shows which step
 * called which. The step ends when `fn` settles; its return value is the output unless one was set.
 *
 *     const docs = await span("search-docs", (step) => search(query), { type: "tool", input: query });
 */
export async function span<T>(name: string, fn: (step: Step) => T | Promise<T>, options: StepOptions = {}): Promise<T> {
  const step = new Step(name, options.type ?? 'span', options.input, options.metadata);
  const parent = stepContext.getStore();
  const inheritedRun = options.runId || parent?.runId || currentRunId();
  const runId = inheritedRun === "unknown" ? createId() : inheritedRun;
  const started = Date.now();
  const client = options.client ?? parent?.client ?? defaultClient();
  const finish = (error?: unknown) => {
    const failed = error !== undefined;
    if (failed && options.root) client.announceFailedRun(runId, failedStepName(error) ?? name);
    else if (failed) markFailedStep(error, name);
    client.ingest({
      spanId: step.id,
      runId,
      parentSpanId: options.root ? undefined : parent?.spanId,
      spanType: options.root ? (failed ? 'error' : 'run_end') : step.type,
      toolName: step.name,
      input: step.input,
      output: failed ? (error instanceof Error ? error.message : String(error)) : step.output,
      latencyMs: Date.now() - started,
      costUsd: 0,
      createdAt: new Date(started).toISOString(),
      metadata: options.root ? { ...step.metadata, stepType: step.type } : step.metadata,
      ...step.fields,
      ...(failed ? {
        errorType: error instanceof Error ? error.name : 'Error',
        errorMessage: payload(error instanceof Error ? error.message : String(error)),
      } : {}),
    });
  };
  return stepContext.run({ runId, spanId: step.id, traceName: options.root ? name : parent?.traceName, client: options.client ?? parent?.client }, async () => {
    try {
      const result = await fn(step);
      if (step.output === undefined) step.setOutput(result);
      finish();
      return result;
    } catch (error) {
      finish(error ?? new Error('Unknown error'));
      throw error;
    }
  });
}

// The innermost step that threw tags the error with its name, so the run's root can say where it failed.
const FAILED_STEP = Symbol('uncoil.failedStep');
function markFailedStep(error: unknown, name: string) {
  if (error && typeof error === 'object' && !(FAILED_STEP in error)) {
    try { Object.defineProperty(error, FAILED_STEP, { value: name }); } catch { /* frozen errors keep the root name */ }
  }
}
function failedStepName(error: unknown): string | undefined {
  return error && typeof error === 'object' ? (error as Record<symbol, string | undefined>)[FAILED_STEP] : undefined;
}

/** Wrap a function so each call is recorded as a step, with its arguments and result. */
export function observe<A extends any[], R>(fn: (...args: A) => R | Promise<R>, options: StepOptions & { name?: string; captureInput?: boolean } = {}) {
  const name = options.name || fn.name || 'step';
  return (...args: A): Promise<R> =>
    span(name, () => fn(...args), { ...options, input: options.captureInput === false ? undefined : args });
}

/**
 * Wrap an agent's entry point. Each call is one trace: a new run id, and a root step that every step recorded
 * inside it hangs from. The root is sent as run_end (or error) when the call settles.
 */
export function traceAgent<T extends (...args: any[]) => Promise<any>>(
  func: T,
  config: UncoilConfig & { name?: string } = {}
): T {
  const client = new UncoilClient(config);
  const name = config.name || func.name || 'agent';
  return ((...args: any[]) => span(name, () => func(...args), { type: 'agent', client, runId: createId(), root: true })) as T;
}

/** The client of the active trace (for example the one traceAgent was given), or the shared default. */
const currentClient = () => currentTraceContext()?.client ?? defaultClient();

/** Record a finished model call. It is attached to the step it was made in. */
export const llmCall = (data: Omit<SpanData, 'spanType'>) =>
  currentClient().ingest({ ...data, spanType: 'llm_call' });

/** Record a finished tool call. It is attached to the step it was made in. */
export const toolCall = (data: Omit<SpanData, 'spanType'>) =>
  currentClient().ingest({ ...data, spanType: 'tool_call' });

export const decision = (data: Omit<SpanData, 'spanType'>) =>
  currentClient().ingest({ ...data, spanType: 'decision' });

export { wrapOpenAI, wrapAnthropic, type IntegrationOptions } from "./integrations/providers";
export { UncoilLangGraphHandler } from "./integrations/langgraph";
export { uncoilMiddleware } from "./integrations/vercel-ai";
export { traceTools } from "./integrations/tools";
export { init, uninit } from "./integrations/auto";
export { runDoctor, formatReport, maskKey, type DoctorReport, type DoctorCheck, type DoctorOptions } from "./doctor";
