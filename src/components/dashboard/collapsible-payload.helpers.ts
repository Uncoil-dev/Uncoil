/** Payloads longer than this many characters render collapsed. */
export const PAYLOAD_COLLAPSE_THRESHOLD = 20_000;
/** Characters shown while a payload is collapsed. */
export const PAYLOAD_PREVIEW_CHARS = 1_000;

export function isLargePayload(text: string): boolean {
  return text.length > PAYLOAD_COLLAPSE_THRESHOLD;
}

export function payloadPreview(text: string): string {
  return text.length > PAYLOAD_PREVIEW_CHARS ? text.slice(0, PAYLOAD_PREVIEW_CHARS) : text;
}

/** Human-readable UTF-8 size of the text, e.g. "812 B", "48.8 KB", "1.2 MB". */
export function payloadSizeLabel(text: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
