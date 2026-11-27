import { planRetentionDays } from "@/lib/retention";

/** Maps a `?tab=` value to a settings tab name, ignoring case; unknown or missing values open General. */
export function resolveSettingsTab(requested: string | null, tabs: readonly string[]): string {
  const wanted = requested?.trim().toLowerCase();
  return (wanted && tabs.find((tab) => tab.toLowerCase() === wanted)) || "General";
}

export const SETTINGS_TAB_GROUPS: { label: string; items: string[] }[] = [
  { label: "Project", items: ["General", "Members", "Privacy", "Data"] },
  { label: "Access", items: ["API Keys", "LLM Connections", "Model Definitions", "MCP & CLI"] },
  { label: "Quality", items: ["Scores", "Batch Actions"] },
  { label: "Connect", items: ["Integrations", "Notifications", "Audit log"] },
];

/** Checks the redaction and retention form; retention may not exceed what the plan keeps. */
export function validatePrivacySettings(values: {
  redactionEnabled: boolean;
  redactionRules: string[];
  retentionDays: string;
  planTier?: string;
}):
  | { ok: true; value: { redactionEnabled: boolean; redactionRules: string[]; retentionDays: number } }
  | { ok: false; error: string } {
  const retentionDays = Number(values.retentionDays);
  const planDays = planRetentionDays(values.planTier);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return { ok: false, error: "Retention must be a whole number of days between 1 and 3650" };
  }
  if (planDays !== null && retentionDays > planDays) {
    return { ok: false, error: `Your plan keeps data for ${planDays} days at most` };
  }
  return { ok: true, value: { redactionEnabled: values.redactionEnabled, redactionRules: values.redactionRules, retentionDays } };
}
