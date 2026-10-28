import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

export type PlaywrightEventType =
  | "run"
  | "test_step"
  | "browser_action"
  | "network_request"
  | "console_error"
  | "assertion"
  | "screenshot"
  | "trace_artifact"
  | "ci_metadata";

export type PlaywrightEventStatus = "started" | "passed" | "failed" | "skipped" | "timed_out" | "info";

export interface PlaywrightArtifact {
  name: string;
  contentType?: string;
  url?: string;
  path?: string;
}

export interface PlaywrightEvent {
  eventType: PlaywrightEventType;
  name: string;
  status: PlaywrightEventStatus;
  startedAt: string;
  durationMs: number;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  parentEventId?: string;
  eventId?: string;
  error?: { message: string; stack?: string; value?: string };
  artifacts?: PlaywrightArtifact[];
}

export interface PlaywrightSpan {
  spanId: string;
  runId: string;
  spanType: PlaywrightEventType | "run_end";
  createdAt: string;
  latencyMs: number;
  input: string;
  output: string;
  metadata: Record<string, unknown>;
  parentSpanId?: string;
  environment?: string;
  release?: string;
  tags?: string[];
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
  attachments?: PlaywrightArtifact[];
}

export type SpanTransport = (span: PlaywrightSpan) => void | Promise<void>;

export interface PlaywrightReporterOptions {
  apiKey?: string;
  host?: string;
  region?: "eu" | "us";
  runId?: string;
  environment?: string;
  release?: string;
  tags?: string[];
  traceArtifactUrl?: string;
  fetch?: typeof globalThis.fetch;
  transport?: SpanTransport;
  onTransportError?: (error: unknown, span: PlaywrightSpan) => void;
}

const REGION_HOSTS = {
  eu: "https://eu.cloud.uncoil.dev",
  us: "https://us.cloud.uncoil.dev",
} as const;

type ActiveTest = {
  spanId: string;
  startedAt: Date;
  test: TestCase;
};

type ActiveStep = {
  spanId: string;
  startedAt: Date;
};

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function json(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function errorDetails(error: TestError | undefined) {
  if (!error) return undefined;
  return { message: error.message ?? error.value ?? "Playwright error", stack: error.stack, value: error.value };
}

function attachmentMetadata(attachments: Array<{ name: string; contentType: string; path?: string }>): PlaywrightArtifact[] {
  return attachments.map((attachment) => ({
    name: attachment.name,
    contentType: attachment.contentType,
    path: attachment.path,
  }));
}

function testKey(test: TestCase, result: TestResult): string {
  return `${test.id}:${result.retry}:${result.parallelIndex}`;
}

export function eventToSpan(event: PlaywrightEvent, options: { runId: string; environment?: string; release?: string; tags?: string[] }): PlaywrightSpan {
  const spanId = event.eventId ?? createId("pw");
  const metadata: Record<string, unknown> = {
    eventType: event.eventType,
    name: event.name,
    status: event.status,
    ...(event.metadata ?? {}),
  };
  if (event.error) metadata.error = event.error;

  return {
    spanId,
    runId: options.runId,
    spanType: event.eventType === "run" ? "run_end" : event.eventType,
    createdAt: event.startedAt,
    latencyMs: Math.max(0, event.durationMs),
    input: json(event.input ?? { name: event.name }),
    output: json(event.output ?? { status: event.status }),
    metadata,
    parentSpanId: event.parentEventId,
    environment: options.environment,
    release: options.release,
    tags: options.tags,
    errorType: event.error ? "playwright_error" : undefined,
    errorMessage: event.error?.message,
    stackTrace: event.error?.stack,
    attachments: event.artifacts,
  };
}

export class PlaywrightReporter implements Reporter {
  readonly runId: string;
  private readonly options: PlaywrightReporterOptions;
  private readonly pending = new Set<Promise<void>>();
  private readonly activeTests = new Map<string, ActiveTest>();
  private readonly activeSteps = new Map<string, ActiveStep>();
  private readonly startedAt = new Date();
  private runMetadata: Record<string, unknown> = {};

  constructor(options: PlaywrightReporterOptions = {}) {
    this.options = options;
    this.runId = options.runId ?? (process.env.UNCOIL_CURRENT_RUN_ID ?? process.env.TRACIFY_CURRENT_RUN_ID) ?? createId("run");
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.runMetadata = {
      workers: config.workers,
      timeoutMs: config.globalTimeout,
      projects: config.projects.map((project) => project.name),
      testCount: suite.allTests().length,
      ci: process.env.CI === "true",
    };
    this.record({
      eventType: "ci_metadata",
      name: "playwright run metadata",
      status: "info",
      startedAt: this.startedAt.toISOString(),
      durationMs: 0,
      input: this.runMetadata,
    });
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    this.activeTests.set(testKey(test, result), { spanId: createId("test"), startedAt: result.startTime, test });
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    const active = this.activeTests.get(testKey(test, result));
    if (!active) return;
    this.activeSteps.set(this.stepKey(test, result, step), { spanId: createId("step"), startedAt: step.startTime });
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const activeTest = this.activeTests.get(testKey(test, result));
    const activeStep = this.activeSteps.get(this.stepKey(test, result, step));
    if (!activeTest || !activeStep) return;
    this.activeSteps.delete(this.stepKey(test, result, step));
    this.record({
      eventType: step.category === "expect" ? "assertion" : "test_step",
      name: step.title,
      status: step.error ? "failed" : "passed",
      startedAt: activeStep.startedAt.toISOString(),
      durationMs: step.duration,
      parentEventId: activeTest.spanId,
      eventId: activeStep.spanId,
      metadata: { category: step.category, titlePath: step.titlePath(), location: step.location },
      error: errorDetails(step.error),
      artifacts: attachmentMetadata(step.attachments),
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const key = testKey(test, result);
    const active = this.activeTests.get(key);
    if (!active) return;
    this.activeTests.delete(key);
    const status = result.status === "timedOut" ? "timed_out" : result.status === "interrupted" ? "failed" : result.status;
    this.record({
      eventType: "test_step",
      name: test.titlePath().join(" › "),
      status: status === "passed" || status === "failed" || status === "skipped" ? status : "failed",
      startedAt: active.startedAt.toISOString(),
      durationMs: result.duration,
      eventId: active.spanId,
      input: { file: test.location.file, line: test.location.line, project: test.parent.project()?.name },
      output: { status: result.status, outcome: test.outcome(), expectedStatus: test.expectedStatus, retry: result.retry },
      metadata: { testId: test.id, tags: test.tags, annotations: result.annotations, worker: result.parallelIndex },
      error: errorDetails(result.error),
      artifacts: attachmentMetadata(result.attachments),
    });
    for (const attachment of result.attachments) {
      if (!attachment.name.toLowerCase().includes("trace") && attachment.contentType !== "application/zip") continue;
      this.record({
        eventType: "trace_artifact",
        name: attachment.name,
        status: "info",
        startedAt: result.startTime.toISOString(),
        durationMs: 0,
        parentEventId: active.spanId,
        input: { contentType: attachment.contentType },
        artifacts: [{ name: attachment.name, contentType: attachment.contentType, path: attachment.path, url: this.options.traceArtifactUrl }],
      });
    }
  }

  onEnd(result: FullResult): Promise<void> {
    this.record({
      eventType: "run",
      name: "playwright run",
      status: result.status === "passed" ? "passed" : result.status === "timedout" ? "timed_out" : "failed",
      startedAt: this.startedAt.toISOString(),
      durationMs: Date.now() - this.startedAt.getTime(),
      eventId: `${this.runId}:run_end`,
      input: this.runMetadata,
      output: { status: result.status },
    });
    return Promise.all([...this.pending]).then(() => undefined);
  }

  record(event: PlaywrightEvent): void {
    const span = eventToSpan(event, {
      runId: this.runId,
      environment: this.options.environment ?? (process.env.UNCOIL_ENVIRONMENT ?? process.env.TRACIFY_ENVIRONMENT),
      release: this.options.release ?? (process.env.UNCOIL_RELEASE ?? process.env.TRACIFY_RELEASE),
      tags: this.options.tags,
    });
    const delivery = this.send(span);
    this.pending.add(delivery);
    void delivery.finally(() => this.pending.delete(delivery));
  }

  recordBrowserAction(name: string, metadata: Record<string, unknown> = {}): void {
    this.record(this.manualEvent("browser_action", name, metadata));
  }

  recordNetworkRequest(name: string, metadata: Record<string, unknown> = {}): void {
    this.record(this.manualEvent("network_request", name, metadata));
  }

  recordConsoleError(message: string, metadata: Record<string, unknown> = {}): void {
    this.record({ ...this.manualEvent("console_error", "console error", metadata), status: "failed", error: { message } });
  }

  recordAssertion(name: string, status: "passed" | "failed", metadata: Record<string, unknown> = {}): void {
    this.record({ ...this.manualEvent("assertion", name, metadata), status });
  }

  recordScreenshot(name: string, artifact: PlaywrightArtifact): void {
    this.record({ ...this.manualEvent("screenshot", name), artifacts: [artifact] });
  }

  recordTraceArtifact(artifact: PlaywrightArtifact): void {
    this.record({
      ...this.manualEvent("trace_artifact", artifact.name),
      artifacts: [{ ...artifact, url: artifact.url ?? this.options.traceArtifactUrl }],
    });
  }

  private manualEvent(eventType: PlaywrightEventType, name: string, metadata?: Record<string, unknown>): PlaywrightEvent {
    return { eventType, name, status: "info", startedAt: new Date().toISOString(), durationMs: 0, metadata };
  }

  private stepKey(test: TestCase, result: TestResult, step: TestStep): string {
    return `${testKey(test, result)}:${step.titlePath().join("/")}:${step.startTime.getTime()}`;
  }

  private async send(span: PlaywrightSpan): Promise<void> {
    try {
      if (this.options.transport) {
        await this.options.transport(span);
        return;
      }
      if (!this.options.apiKey && !(process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY)) return;
      const apiKey = this.options.apiKey ?? (process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY);
      const host = (this.options.host ?? (process.env.UNCOIL_HOST ?? process.env.TRACIFY_HOST) ?? REGION_HOSTS[this.options.region ?? "eu"]).replace(/\/$/, "");
      const fetchImpl = this.options.fetch ?? globalThis.fetch;
      if (!fetchImpl) return;
      const response = await fetchImpl(`${host}/api/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(span),
      });
      if (!response.ok) throw new Error(`Uncoil Playwright ingest failed (${response.status})`);
    } catch (error) {
      this.options.onTransportError?.(error, span);
    }
  }
}

export default PlaywrightReporter;
