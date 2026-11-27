/**
 * Switch that keeps message content out of everything the SDK sends.
 * With content capture off, spans keep names, timings, token counts, cost, status and the error type;
 * prompts, answers, tool inputs and outputs, error messages and feedback text are left out.
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
  delete copy.attachments;
  const metadata = copy.metadata && typeof copy.metadata === "object" ? copy.metadata : {};
  return { ...copy, input: "", output: "", metadata: { ...metadata, contentRecorded: false } } as unknown as T;
}

/** Drop free text from feedback and scores: comments, reasons and the value of a text answer. */
export function stripFeedbackContent<T extends object>(body: T): T {
  const copy: Record<string, unknown> = { ...body } as Record<string, unknown>;
  delete copy.comment;
  delete copy.reason;
  if (copy.kind === "text" && !copy.name && typeof copy.value === "string") copy.value = "[not recorded]";
  return copy as unknown as T;
}
