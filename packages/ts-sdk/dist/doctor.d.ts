import { type TracifyRegion } from "./index";
export type DoctorStatus = "ok" | "warn" | "fail" | "skip";
export interface DoctorCheck {
    id: "runtime" | "key" | "region" | "network" | "trace";
    title: string;
    status: DoctorStatus;
    message: string;
    /** Plain-language fix, present when the check did not pass. */
    hint?: string;
}
export interface DoctorOptions {
    apiKey?: string;
    region?: TracifyRegion;
    host?: string;
    /** Skip the test trace; only check the key shape, region and network. */
    send?: boolean;
    /** Seconds before a request is given up on. Defaults to 10. */
    timeoutMs?: number;
}
export interface DoctorReport {
    ok: boolean;
    host: string;
    checks: DoctorCheck[];
    /** Set when the test trace was accepted. Search for it in your dashboard. */
    runId?: string;
}
/** Shows enough of a key to recognise it without leaking it. */
export declare function maskKey(apiKey: string): string;
/** Runs every setup check in order and never throws. */
export declare function runDoctor(options?: DoctorOptions): Promise<DoctorReport>;
export declare function formatReport(report: DoctorReport): string;
