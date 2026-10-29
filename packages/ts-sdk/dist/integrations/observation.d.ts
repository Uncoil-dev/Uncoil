import { UncoilClient, type SpanData } from "../index";
export type IntegrationOptions = {
    client?: UncoilClient;
    name?: string;
    captureInput?: boolean;
    captureOutput?: boolean;
    calculateCost?: (usage: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
        usage: Record<string, unknown>;
    }) => number;
};
export declare function observation(provider: string, model: string, input: unknown, options: IntegrationOptions, scope?: {
    runId: string;
    parentSpanId?: string;
    spanId?: string;
    root?: boolean;
    type?: string;
    name?: string;
}): {
    id: string;
    runId: string;
    data: SpanData;
    started: number;
    usage(raw?: Record<string, unknown>, actualModel?: string): void;
    token(): void;
    finish(output?: unknown, error?: unknown, cancelled?: boolean): void;
};
export type Observation = ReturnType<typeof observation>;
