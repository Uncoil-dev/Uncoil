const REGION_HOSTS = {
    eu: "https://eu.cloud.uncoil.dev",
    us: "https://us.cloud.uncoil.dev",
};
function createId(prefix) {
    return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
function json(value) {
    if (typeof value === "string")
        return value;
    if (value === undefined)
        return "";
    try {
        return JSON.stringify(value);
    }
    catch {
        return "[unserializable]";
    }
}
function errorDetails(error) {
    if (!error)
        return undefined;
    return { message: error.message ?? error.value ?? "Playwright error", stack: error.stack, value: error.value };
}
function attachmentMetadata(attachments) {
    return attachments.map((attachment) => ({
        name: attachment.name,
        contentType: attachment.contentType,
        path: attachment.path,
    }));
}
function testKey(test, result) {
    return `${test.id}:${result.retry}:${result.parallelIndex}`;
}
export function eventToSpan(event, options) {
    const spanId = event.eventId ?? createId("pw");
    const metadata = {
        eventType: event.eventType,
        name: event.name,
        status: event.status,
        ...(event.metadata ?? {}),
    };
    if (event.error)
        metadata.error = event.error;
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
export class PlaywrightReporter {
    runId;
    options;
    pending = new Set();
    activeTests = new Map();
    activeSteps = new Map();
    startedAt = new Date();
    runMetadata = {};
    constructor(options = {}) {
        this.options = options;
        this.runId = options.runId ?? process.env.UNCOIL_CURRENT_RUN_ID ?? createId("run");
    }
    onBegin(config, suite) {
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
    onTestBegin(test, result) {
        this.activeTests.set(testKey(test, result), { spanId: createId("test"), startedAt: result.startTime, test });
    }
    onStepBegin(test, result, step) {
        const active = this.activeTests.get(testKey(test, result));
        if (!active)
            return;
        this.activeSteps.set(this.stepKey(test, result, step), { spanId: createId("step"), startedAt: step.startTime });
    }
    onStepEnd(test, result, step) {
        const activeTest = this.activeTests.get(testKey(test, result));
        const activeStep = this.activeSteps.get(this.stepKey(test, result, step));
        if (!activeTest || !activeStep)
            return;
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
    onTestEnd(test, result) {
        const key = testKey(test, result);
        const active = this.activeTests.get(key);
        if (!active)
            return;
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
            if (!attachment.name.toLowerCase().includes("trace") && attachment.contentType !== "application/zip")
                continue;
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
    onEnd(result) {
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
    record(event) {
        const span = eventToSpan(event, {
            runId: this.runId,
            environment: this.options.environment ?? process.env.UNCOIL_ENVIRONMENT,
            release: this.options.release ?? process.env.UNCOIL_RELEASE,
            tags: this.options.tags,
        });
        const delivery = this.send(span);
        this.pending.add(delivery);
        void delivery.finally(() => this.pending.delete(delivery));
    }
    recordBrowserAction(name, metadata = {}) {
        this.record(this.manualEvent("browser_action", name, metadata));
    }
    recordNetworkRequest(name, metadata = {}) {
        this.record(this.manualEvent("network_request", name, metadata));
    }
    recordConsoleError(message, metadata = {}) {
        this.record({ ...this.manualEvent("console_error", "console error", metadata), status: "failed", error: { message } });
    }
    recordAssertion(name, status, metadata = {}) {
        this.record({ ...this.manualEvent("assertion", name, metadata), status });
    }
    recordScreenshot(name, artifact) {
        this.record({ ...this.manualEvent("screenshot", name), artifacts: [artifact] });
    }
    recordTraceArtifact(artifact) {
        this.record({
            ...this.manualEvent("trace_artifact", artifact.name),
            artifacts: [{ ...artifact, url: artifact.url ?? this.options.traceArtifactUrl }],
        });
    }
    manualEvent(eventType, name, metadata) {
        return { eventType, name, status: "info", startedAt: new Date().toISOString(), durationMs: 0, metadata };
    }
    stepKey(test, result, step) {
        return `${testKey(test, result)}:${step.titlePath().join("/")}:${step.startTime.getTime()}`;
    }
    async send(span) {
        try {
            if (this.options.transport) {
                await this.options.transport(span);
                return;
            }
            if (!this.options.apiKey && !process.env.UNCOIL_API_KEY)
                return;
            const apiKey = this.options.apiKey ?? process.env.UNCOIL_API_KEY;
            const host = (this.options.host ?? process.env.UNCOIL_HOST ?? REGION_HOSTS[this.options.region ?? "eu"]).replace(/\/$/, "");
            const fetchImpl = this.options.fetch ?? globalThis.fetch;
            if (!fetchImpl)
                return;
            const response = await fetchImpl(`${host}/api/ingest`, {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify(span),
            });
            if (!response.ok)
                throw new Error(`Uncoil Playwright ingest failed (${response.status})`);
        }
        catch (error) {
            this.options.onTransportError?.(error, span);
        }
    }
}
export default PlaywrightReporter;
