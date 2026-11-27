import { formatTime, parseTime, relativeTime } from "../tracing/format";

/** "3h ago", with the start in the viewer's local time on hover, as on Tracing. */
export function StartedAt({ value, clock }: { value: string; clock: number }) {
  const parsed = parseTime(value);
  return <time dateTime={Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined} title={formatTime(value)}>{relativeTime(value, clock)}</time>;
}
