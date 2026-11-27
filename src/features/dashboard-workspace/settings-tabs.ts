/** Maps a `?tab=` value to a settings tab name, ignoring case; unknown or missing values open General. */
export function resolveSettingsTab(requested: string | null, tabs: readonly string[]): string {
  const wanted = requested?.trim().toLowerCase();
  return (wanted && tabs.find((tab) => tab.toLowerCase() === wanted)) || "General";
}
