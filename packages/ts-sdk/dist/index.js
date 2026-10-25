"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskKey = exports.formatReport = exports.runDoctor = exports.traceTools = exports.tracifyMiddleware = exports.TracifyLangGraphHandler = exports.wrapAnthropic = exports.wrapOpenAI = exports.decision = exports.toolCall = exports.llmCall = exports.Step = exports.TracifyClient = exports.MAX_PAYLOAD_CHARS = exports.TRACIFY_REGION_HOSTS = exports.TracifyError = void 0;
exports.currentRunId = currentRunId;
exports.currentTraceContext = currentTraceContext;
exports.integrationPayload = integrationPayload;
exports.currentSpanId = currentSpanId;
exports.buildRedactor = buildRedactor;
exports.sampleBucket = sampleBucket;
exports.span = span;
exports.observe = observe;
exports.traceAgent = traceAgent;
const node_async_hooks_1 = require("node:async_hooks");
/** A problem the SDK ran into, with a plain-language fix in `hint`. */
class TracifyError extends Error {
    constructor(code, message, hint, status) {
        super(`${message} ${hint}`);
        this.name = "TracifyError";
        this.code = code;
        this.hint = hint;
        this.status = status;
    }
}
exports.TracifyError = TracifyError;
exports.TRACIFY_REGION_HOSTS = {
    eu: "https://eu.cloud.tracify.tech",
    us: "https://us.cloud.tracify.tech",
};
function parseRegion(value) {
    const normalized = value?.trim().toLowerCase();
    return normalized === "eu" || normalized === "us" ? normalized : undefined;
}
function apiKeyRegion(apiKey) {
    if (apiKey.startsWith("tracify_sk_live_eu_"))
        return "eu";
    if (apiKey.startsWith("tracify_sk_live_us_"))
        return "us";
    if (apiKey.startsWith("tracify_sk_live_"))
        return "eu";
    return undefined;
}
/**
 * The current run and step for this async call chain. AsyncLocalStorage keeps concurrent runs apart, so steps
 * from two agents running at once never land in each other's trace.
 */
const stepContext = new node_async_hooks_1.AsyncLocalStorage();
function currentRunId() {
    return stepContext.getStore()?.runId || process.env.TRACIFY_CURRENT_RUN_ID || 'unknown';
}
function currentTraceContext() { return stepContext.getStore(); }
function integrationPayload(value) { return payload(value); }
function currentSpanId() {
    return stepContext.getStore()?.spanId;
}
exports.MAX_PAYLOAD_CHARS = 10000;
const SECRET_PATTERNS = [
    /\bbearer\s+[a-z0-9._~+/=-]{12,}/gi,
    /\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/g,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];
const SECRET_FIELD = /((?:api[_-]?key|password|secret|token)["']?\s*[:=]\s*["']?)[^\s"',}]{6,}/gi;
/** Serialise an input or output, remove obvious secrets and cap its size. */
function payload(value) {
    if (value === undefined || value === null)
        return '';
    let text;
    if (typeof value === 'string')
        text = value;
    else {
        try {
            text = JSON.stringify(value);
        }
        catch {
            text = String(value);
        }
    }
    for (const pattern of SECRET_PATTERNS)
        text = text.replace(pattern, '[redacted]');
    text = text.replace(SECRET_FIELD, '$1[redacted]');
    return text.length > exports.MAX_PAYLOAD_CHARS ? `${text.slice(0, exports.MAX_PAYLOAD_CHARS)}… [truncated ${text.length - exports.MAX_PAYLOAD_CHARS} chars]` : text;
}
const PII_PATTERNS = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    /\b(?:\d[ -]?){13,19}\b/g,
    /(?<![\w.])\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
];
/** Build a function that applies the extra clean-up asked for in `redact`. Returns undefined when nothing is asked. */
function buildRedactor(options) {
    if (!options)
        return undefined;
    const replacement = options.replacement ?? "[redacted]";
    const patterns = [];
    if (options.pii)
        patterns.push(...PII_PATTERNS);
    for (const pattern of options.patterns ?? []) {
        if (typeof pattern === "string") {
            if (pattern)
                patterns.push(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
        }
        else
            patterns.push(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));
    }
    if (!patterns.length && !options.fn)
        return undefined;
    return (text) => {
        for (const pattern of patterns)
            text = text.replace(pattern, replacement);
        return options.fn ? options.fn(text) : text;
    };
}
/** Stable number in [0, 1) for a run id, so every span of a run gets the same sampling decision. */
function sampleBucket(runId) {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryableError(error, retryableErrors) {
    if (!(error instanceof Error))
        return false;
    if (error.name === "AbortError")
        return false; // AbortError is never retryable
    const msg = error.message.toLowerCase();
    const name = error.name?.toLowerCase?.() ?? "";
    const status = error.status ?? error.statusCode ?? 0;
    for (const code of retryableErrors) {
        switch (code) {
            case "timeout":
                if (msg.includes("timeout") || msg.includes("timed out") || name === "timeouterror")
                    return true;
                break;
            case "5xx":
                if (status >= 500 && status < 600)
                    return true;
                break;
            case "429":
                if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests"))
                    return true;
                break;
            case "rate_limit":
                if (status === 429 || msg.includes("rate limit") || msg.includes("throttl"))
                    return true;
                break;
            case "overloaded":
                if (msg.includes("overloaded") || msg.includes("capacity") || msg.includes("busy"))
                    return true;
                break;
        }
    }
    return false;
}
function isLatencyAbort(error) {
    return error instanceof Error && error.name === "AbortError";
}
class TracifyClient {
    constructor(config = {}) {
        this._lastFailOpen = false;
        this.promptCache = new Map();
        this.sampleRate = 1;
        this.keepErrors = true;
        this.warned = new Set();
        this.apiKey = (config.apiKey || process.env.TRACIFY_API_KEY || '').trim();
        this.onError = config.onError;
        if (config.sampleRate !== undefined && !(config.sampleRate >= 0 && config.sampleRate <= 1)) {
            throw new TracifyError("bad_sample_rate", `sampleRate must be a number from 0 to 1, but got ${String(config.sampleRate)}.`, "Use 1 to record every run, 0.1 to record about one in ten.");
        }
        this.sampleRate = config.sampleRate ?? 1;
        this.keepErrors = config.keepErrors ?? true;
        this.redactor = buildRedactor(config.redact);
        if (!this.apiKey) {
            this.report(new TracifyError("missing_key", "No Tracify API key was found, so nothing will be recorded.", "Pass { apiKey } to the client or set the TRACIFY_API_KEY environment variable. You can create a key on the API keys page of your dashboard."));
        }
        else if (!this.apiKey.startsWith("tracify_sk_")) {
            this.report(new TracifyError("odd_key", "That API key does not look like a Tracify key (they start with tracify_sk_).", "Copy the key again from the API keys page of your dashboard; make sure no other service's key was pasted by mistake."));
        }
        const configuredRegion = config.region ?? parseRegion(process.env.TRACIFY_REGION) ?? "eu";
        this.host = (config.host || process.env.TRACIFY_HOST || exports.TRACIFY_REGION_HOSTS[configuredRegion]).replace(/\/$/, '');
        const selectedHostRegion = Object.entries(exports.TRACIFY_REGION_HOSTS).find(([, host]) => host === this.host)?.[0];
        const keyRegion = apiKeyRegion(this.apiKey);
        if (keyRegion && selectedHostRegion && keyRegion !== selectedHostRegion) {
            throw new TracifyError("region_mismatch", `Tracify API key region mismatch: this key belongs to ${keyRegion.toUpperCase()}, but the client is configured for ${selectedHostRegion.toUpperCase()}.`, `Set region: "${keyRegion}" (or TRACIFY_REGION=${keyRegion}), or create a key in the ${selectedHostRegion.toUpperCase()} region.`);
        }
        this.projectId = config.projectId;
        this.release = config.release;
        this.environment = config.environment;
        this.deploymentId = config.deploymentId;
        this.sessionId = config.sessionId;
        this.endUserId = config.endUserId;
        this.tags = config.tags;
        try {
            new URL(this.host);
        }
        catch {
            throw new TracifyError("bad_host", `The host "${this.host}" is not a valid web address.`, 'Use a full address such as "https://eu.cloud.tracify.tech", or drop the host option and use region: "eu" or "us".');
        }
        this.ingestUrl = `${this.host}/api/ingest`;
        this.checkCostUrl = `${this.host}/api/orchestration/check-cost`;
    }
    clean(value) {
        const text = payload(value);
        return this.redactor && text ? this.redactor(text) : text;
    }
    /** Tell the app about a problem once per kind: through `onError` if given, otherwise as a console warning. */
    report(error) {
        if (this.warned.has(error.code))
            return;
        this.warned.add(error.code);
        if (this.onError) {
            try {
                this.onError(error);
            }
            catch { /* a faulty handler must never break the app */ }
        }
        else
            console.warn(`Tracify Warning: ${error.message}`);
    }
    /** True when this span should be dropped by sampling. */
    sampledOut(runId, data) {
        if (this.sampleRate >= 1)
            return false;
        if (this.keepErrors && (data.errorType || data.errorMessage))
            return false;
        return sampleBucket(runId) >= this.sampleRate;
    }
    async checkIngestResponse(response) {
        if (response.ok)
            return;
        const status = response.status;
        if (status === 401)
            this.report(new TracifyError("bad_key", "Tracify rejected the API key (401).", "The key is wrong, was revoked, or belongs to another region. Check TRACIFY_API_KEY and TRACIFY_REGION.", status));
        else if (status === 403)
            this.report(new TracifyError("forbidden", "This API key is not allowed to send data (403).", "Check that the key belongs to the project you expect and has not been disabled.", status));
        else if (status === 429)
            this.report(new TracifyError("rate_limited", "Tracify is receiving too much data from this app (429).", "Lower the volume with sampleRate (for example 0.2), or upgrade your plan.", status));
        else if (status >= 500)
            this.report(new TracifyError("server_error", `Tracify had a problem on its side (${status}).`, "Your app is not affected; data from this moment may be missing. Check the status page if it keeps happening.", status));
        else
            this.report(new TracifyError("rejected", `Tracify did not accept a span (${status}).`, "Update the SDK to the latest version; if it still happens, contact support.", status));
    }
    async ingest(data) {
        if (!this.apiKey)
            return;
        const context = stepContext.getStore();
        const spanId = data.spanId || createId();
        if (this.sampledOut(data.runId || currentRunId(), data))
            return;
        const parentSpanId = data.parentSpanId || (context?.spanId && context.spanId !== spanId ? context.spanId : undefined);
        const span = {
            ...data,
            spanId,
            runId: data.runId || currentRunId(),
            traceName: data.traceName ?? context?.traceName,
            parentSpanId,
            createdAt: data.createdAt || new Date().toISOString(),
            metadata: data.metadata || {},
            input: this.clean(data.input),
            output: this.clean(data.output),
            release: data.release ?? this.release,
            environment: data.environment ?? this.environment,
            deploymentId: data.metadata?.deploymentId ?? this.deploymentId,
            sessionId: data.sessionId ?? this.sessionId,
            endUserId: data.endUserId ?? this.endUserId,
            tags: data.tags ?? this.tags,
        };
        try {
            fetch(this.ingestUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(span),
            }).then((response) => this.checkIngestResponse(response)).catch((err) => this.report(new TracifyError("network", `Could not reach Tracify (${err?.message ?? err}).`, "Check your internet connection and the host setting. Your app keeps running; these spans are dropped.")));
        }
        catch {
            // Ignore errors in telemetry
        }
    }
    /** Resolve a prompt version labeled for an environment without redeploying application code. */
    async getPrompt(name, environment = "production", options = {}) {
        if (!this.apiKey)
            throw new Error("A Tracify API key is required to resolve prompts");
        const key = `${name}:${environment}`;
        const cached = this.promptCache.get(key);
        if (cached && cached.expiresAt > Date.now())
            return cached.value;
        try {
            const response = await fetch(`${this.host}/api/prompts/${encodeURIComponent(name)}?environment=${encodeURIComponent(environment)}`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(data?.error || `Prompt resolution failed (${response.status})`);
            const value = data;
            this.promptCache.set(key, { value, expiresAt: Date.now() + (options.cacheTtlMs ?? 60000) });
            return value;
        }
        catch (error) {
            if (cached)
                return cached.value;
            if (options.fallback)
                return options.fallback;
            throw error;
        }
    }
    /** Attach end-user feedback to a trace or span. The request is fire-and-forget like span ingestion. */
    feedback(traceId, value, options = {}) {
        if (!this.apiKey || !(options.projectId || this.projectId))
            return;
        fetch(`${this.host}/api/feedback`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: options.projectId || this.projectId, traceId, spanId: options.spanId, kind: options.kind || (typeof value === 'number' ? 'star' : typeof value === 'boolean' ? 'thumb' : 'text'), value, reason: options.reason, comment: options.comment, endUserId: options.endUserId, dedupeKey: options.dedupeKey }) }).catch((error) => console.warn('Tracify Warning: Failed to record feedback:', error));
    }
    /** Attach a typed score to a trace or span through the feedback API. */
    score(traceId, name, value, options = {}) {
        if (!this.apiKey || !(options.projectId || this.projectId))
            return;
        fetch(`${this.host}/api/feedback`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: options.projectId || this.projectId, traceId, spanId: options.spanId, kind: 'text', name, value, dataType: options.dataType, comment: options.comment }) }).catch((error) => console.warn('Tracify Warning: Failed to record score:', error));
    }
    /**
     * Server-side cost check. Returns the server's decision on whether
     * the next call would exceed the ceiling.
     */
    async checkCost(runId, incrementUsd) {
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
        }
        catch {
            this._lastFailOpen = true;
            return { allowed: true, reason: "network_error" };
        }
    }
    async orchestrate(options) {
        const { policy, call, model, input, calculateCost, runId: explicitRunId } = options;
        const runId = explicitRunId || stepContext.getStore()?.runId || process.env.TRACIFY_CURRENT_RUN_ID || createId();
        const allModels = [model, ...policy.fallbackChain.filter((m) => m !== model)];
        let lastError = null;
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
                let latencyTimer;
                if (policy.latencyBudgetMs !== undefined && policy.enforcementMode === "enforce") {
                    latencyTimer = setTimeout(() => controller.abort(), policy.latencyBudgetMs);
                }
                try {
                    const result = await call(currentModel, controller.signal);
                    const latencyMs = Date.now() - startTime;
                    const costUsd = calculateCost ? calculateCost(result, currentModel) : 0;
                    if (latencyTimer)
                        clearTimeout(latencyTimer);
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
                }
                catch (error) {
                    const latencyMs = Date.now() - startTime;
                    if (latencyTimer)
                        clearTimeout(latencyTimer);
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
exports.TracifyClient = TracifyClient;
/** A step in progress. Set its output and anything it measured before it ends. */
class Step {
    constructor(name, type, input, metadata) {
        this.name = name;
        this.type = type;
        this.input = input;
        this.id = createId();
        this.fields = {};
        this.metadata = { ...(metadata ?? {}) };
    }
    setOutput(output) {
        this.output = output;
        return this;
    }
    /** Record what the step measured; anything not listed goes into metadata. */
    set({ model, inputTokens, outputTokens, costUsd, ...metadata }) {
        if (model !== undefined)
            this.fields.modelId = model;
        if (inputTokens !== undefined)
            this.fields.inputTokens = inputTokens;
        if (outputTokens !== undefined)
            this.fields.outputTokens = outputTokens;
        if (costUsd !== undefined)
            this.fields.costUsd = costUsd;
        Object.assign(this.metadata, metadata);
        return this;
    }
}
exports.Step = Step;
let defaultClientInstance;
function defaultClient() {
    return (defaultClientInstance ?? (defaultClientInstance = new TracifyClient()));
}
/**
 * Record one step of the agent. Steps started inside `fn` become its children, so the trace shows which step
 * called which. The step ends when `fn` settles; its return value is the output unless one was set.
 *
 *     const docs = await span("search-docs", (step) => search(query), { type: "tool", input: query });
 */
async function span(name, fn, options = {}) {
    const step = new Step(name, options.type ?? 'span', options.input, options.metadata);
    const parent = stepContext.getStore();
    const inheritedRun = options.runId || parent?.runId || currentRunId();
    const runId = inheritedRun === "unknown" ? createId() : inheritedRun;
    const started = Date.now();
    const finish = (error) => {
        const failed = error !== undefined;
        (options.client ?? parent?.client ?? defaultClient()).ingest({
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
            if (step.output === undefined)
                step.setOutput(result);
            finish();
            return result;
        }
        catch (error) {
            finish(error ?? new Error('Unknown error'));
            throw error;
        }
    });
}
/** Wrap a function so each call is recorded as a step, with its arguments and result. */
function observe(fn, options = {}) {
    const name = options.name || fn.name || 'step';
    return (...args) => span(name, () => fn(...args), { ...options, input: options.captureInput === false ? undefined : args });
}
/**
 * Wrap an agent's entry point. Each call is one trace: a new run id, and a root step that every step recorded
 * inside it hangs from. The root is sent as run_end (or error) when the call settles.
 */
function traceAgent(func, config = {}) {
    const client = new TracifyClient(config);
    const name = config.name || func.name || 'agent';
    return ((...args) => span(name, () => func(...args), { type: 'agent', client, runId: createId(), root: true }));
}
/** Record a finished model call. It is attached to the step it was made in. */
const llmCall = (data) => defaultClient().ingest({ ...data, spanType: 'llm_call' });
exports.llmCall = llmCall;
/** Record a finished tool call. It is attached to the step it was made in. */
const toolCall = (data) => defaultClient().ingest({ ...data, spanType: 'tool_call' });
exports.toolCall = toolCall;
const decision = (data) => defaultClient().ingest({ ...data, spanType: 'decision' });
exports.decision = decision;
var providers_1 = require("./integrations/providers");
Object.defineProperty(exports, "wrapOpenAI", { enumerable: true, get: function () { return providers_1.wrapOpenAI; } });
Object.defineProperty(exports, "wrapAnthropic", { enumerable: true, get: function () { return providers_1.wrapAnthropic; } });
var langgraph_1 = require("./integrations/langgraph");
Object.defineProperty(exports, "TracifyLangGraphHandler", { enumerable: true, get: function () { return langgraph_1.TracifyLangGraphHandler; } });
var vercel_ai_1 = require("./integrations/vercel-ai");
Object.defineProperty(exports, "tracifyMiddleware", { enumerable: true, get: function () { return vercel_ai_1.tracifyMiddleware; } });
var tools_1 = require("./integrations/tools");
Object.defineProperty(exports, "traceTools", { enumerable: true, get: function () { return tools_1.traceTools; } });
var doctor_1 = require("./doctor");
Object.defineProperty(exports, "runDoctor", { enumerable: true, get: function () { return doctor_1.runDoctor; } });
Object.defineProperty(exports, "formatReport", { enumerable: true, get: function () { return doctor_1.formatReport; } });
Object.defineProperty(exports, "maskKey", { enumerable: true, get: function () { return doctor_1.maskKey; } });
