export type QuietHours = { enabled: boolean; startMinute: number; endMinute: number; timezone: string };

/** Minutes after midnight at `now` in the given IANA timezone. Unknown zones fall back to UTC. */
export function minuteOfDay(now: number, timezone: string) {
  let zone = timezone;
  try { new Intl.DateTimeFormat("en-GB", { timeZone: zone }); } catch { zone = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** True while the daily window is on. A window like 22:00 to 07:00 runs across midnight; equal start and end means off. */
export function inQuietHours(config: QuietHours | null | undefined, now: number) {
  if (!config || !config.enabled || config.startMinute === config.endMinute) return false;
  const minute = minuteOfDay(now, config.timezone);
  return config.startMinute < config.endMinute
    ? minute >= config.startMinute && minute < config.endMinute
    : minute >= config.startMinute || minute < config.endMinute;
}

export function isValidTimezone(timezone: string) {
  try { new Intl.DateTimeFormat("en-GB", { timeZone: timezone }); return true; } catch { return false; }
}
