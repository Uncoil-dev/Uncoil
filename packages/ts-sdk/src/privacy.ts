/**
 * Switch that keeps message content out of everything the SDK sends.
 * With content capture off, spans keep names, timings, token counts, cost, status and the error type;
 * prompts, answers, tool inputs and outputs, error messages, stack traces and feedback text are left out. Metadata you attach yourself is still sent.
 */

const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

/** An explicit option wins; otherwise UNCOIL_CAPTURE_CONTENT decides. Unset or unknown values capture. */
export function resolveCaptureContent(option?: boolean): boolean {
  if (option !== undefined) return option;
  return !FALSE_VALUES.has((process.env.UNCOIL_CAPTURE_CONTENT ?? "").trim().toLowerCase());
}

/** Return the span without message text. Ingestion needs input or output present, so both stay as empty strings. */
export function stripSpanContent<T extends object>(span: T): T {
  const copy: Record<string, unknown> = { ...span } as Record<string, unknown>;
  delete copy.errorMessage;
  delete copy.stackTrace;
  delete copy.attachments;
  const metadata = copy.metadata && typeof copy.metadata === "object" ? copy.metadata : {};
  return { ...copy, input: "", output: "", metadata: { ...metadata, contentRecorded: false } } as unknown as T;
}

const FEEDBACK_KEYS = ["projectId", "traceId", "spanId", "kind", "name", "value", "dataType", "endUserId", "dedupeKey"];

/**
 * Keep only the known content-free feedback fields, so any text field added later is left out by default.
 * A string value is replaced unless the score is categorical, because only categories are content-free.
 */
export function stripFeedbackContent<T extends object>(body: T): T {
  const source = body as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key of FEEDBACK_KEYS) if (key in source) copy[key] = source[key];
  if (typeof copy.value === "string" && copy.dataType !== "categorical") copy.value = "[not recorded]";
  return copy as unknown as T;
}
