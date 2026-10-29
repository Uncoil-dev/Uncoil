export interface UncoilConfig {
    apiKey?: string;
    host?: string;
    /** Uncoil Cloud data region. Ignored when `host` is provided. Defaults to UNCOIL_REGION or EU. */
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
export declare class UncoilError extends Error {
    readonly code: string;
    readonly hint: string;
    readonly status?: number;
    constructor(code: string, message: string, hint: string, status?: number);
}
export type UncoilRegion = "eu" | "us";
export declare const UNCOIL_REGION_HOSTS: Record<UncoilRegion, string>;
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
    prompt: {
        id: string;
        name: string;
        description?: string;
        type: "text" | "chat";
    };
    version: {
        id: string;
        version: number;
        content: string;
        variables: string[];
        labels: string[];
        model?: string;
        createdAt: number;
    };
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
export declare function currentRunId(): string;
export declare function currentTraceContext(): {
    runId: string;
    spanId?: string;
    traceName?: string;
    client?: UncoilClient;
} | undefined;
export declare function integrationPayload(value: unknown): string;
export declare function currentSpanId(): string | undefined;
export declare const MAX_PAYLOAD_CHARS = 10000;
/** Build the clean-up for `redact`. Emails, phone numbers and card numbers are masked unless `pii: false`. */
export declare function buildRedactor(options?: RedactionOptions): ((text: string) => string) | undefined;
/** Stable number in [0, 1) for a run id, so every span of a run gets the same sampling decision. */
export declare function sampleBucket(runId: string): number;
export declare class UncoilClient {
    protected apiKey: string;
    protected host: string;
    protected ingestUrl: string;
    protected projectId?: string;
    private checkCostUrl;
    private _lastFailOpen;
    private promptCache;
    private release?;
    private environment?;
    private deploymentId?;
    private sessionId?;
    private endUserId?;
    private tags?;
    private sampleRate;
    private keepErrors;
    private redactor?;
    private onError?;
    private warned;
    constructor(config?: UncoilConfig);
    private clean;
    /** Tell the app about a problem once per kind: through `onError` if given, otherwise as a console warning. */
    private report;
    /** True when this span should be dropped by sampling. */
    private sampledOut;
    private checkIngestResponse;
    ingest(data: SpanData): Promise<void>;
    /** Resolve a prompt version labeled for an environment without redeploying application code. */
    getPrompt(name: string, environment?: string, options?: PromptResolutionOptions): Promise<PromptResolution>;
    /** Attach end-user feedback to a trace or span. The request is fire-and-forget like span ingestion. */
    feedback(traceId: string, value: boolean | number | string, options?: {
        kind?: 'thumb' | 'star' | 'text';
        spanId?: string;
        reason?: string;
        comment?: string;
        endUserId?: string;
        dedupeKey?: string;
        projectId?: string;
    }): void;
    /** Attach a typed score to a trace or span through the feedback API. */
    score(traceId: string, name: string, value: boolean | number | string, options?: {
        dataType?: 'numeric' | 'boolean' | 'categorical' | 'text';
        spanId?: string;
        comment?: string;
        projectId?: string;
    }): void;
    /**
     * Server-side cost check. Returns the server's decision on whether
     * the next call would exceed the ceiling.
     */
    private checkCost;
    orchestrate<T>(options: OrchestrateOptions<T>): Promise<T>;
}
export type StepType = 'agent' | 'llm' | 'tool' | 'retrieval' | 'span' | (string & {});
/** A step in progress. Set its output and anything it measured before it ends. */
export declare class Step {
    readonly name: string;
    readonly type: StepType;
    readonly input?: unknown | undefined;
    readonly id: string;
    output: unknown;
    metadata: Record<string, any>;
    fields: Partial<Pick<SpanData, 'modelId' | 'inputTokens' | 'outputTokens' | 'costUsd'>>;
    constructor(name: string, type: StepType, input?: unknown | undefined, metadata?: Record<string, any>);
    setOutput(output: unknown): this;
    /** Record what the step measured; anything not listed goes into metadata. */
    set({ model, inputTokens, outputTokens, costUsd, ...metadata }: {
        model?: string;
        inputTokens?: number;
        outputTokens?: number;
        costUsd?: number;
        [key: string]: any;
    }): this;
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
/**
 * Record one step of the agent. Steps started inside `fn` become its children, so the trace shows which step
 * called which. The step ends when `fn` settles; its return value is the output unless one was set.
 *
 *     const docs = await span("search-docs", (step) => search(query), { type: "tool", input: query });
 */
export declare function span<T>(name: string, fn: (step: Step) => T | Promise<T>, options?: StepOptions): Promise<T>;
/** Wrap a function so each call is recorded as a step, with its arguments and result. */
export declare function observe<A extends any[], R>(fn: (...args: A) => R | Promise<R>, options?: StepOptions & {
    name?: string;
    captureInput?: boolean;
}): (...args: A) => Promise<R>;
/**
 * Wrap an agent's entry point. Each call is one trace: a new run id, and a root step that every step recorded
 * inside it hangs from. The root is sent as run_end (or error) when the call settles.
 */
export declare function traceAgent<T extends (...args: any[]) => Promise<any>>(func: T, config?: UncoilConfig & {
    name?: string;
}): T;
/** Record a finished model call. It is attached to the step it was made in. */
export declare const llmCall: (data: Omit<SpanData, "spanType">) => Promise<void>;
/** Record a finished tool call. It is attached to the step it was made in. */
export declare const toolCall: (data: Omit<SpanData, "spanType">) => Promise<void>;
export declare const decision: (data: Omit<SpanData, "spanType">) => Promise<void>;
export { wrapOpenAI, wrapAnthropic, type IntegrationOptions } from "./integrations/providers";
export { UncoilLangGraphHandler } from "./integrations/langgraph";
export { uncoilMiddleware } from "./integrations/vercel-ai";
export { traceTools } from "./integrations/tools";
export { init, uninit } from "./integrations/auto";
export { runDoctor, formatReport, maskKey, type DoctorReport, type DoctorCheck, type DoctorOptions } from "./doctor";
