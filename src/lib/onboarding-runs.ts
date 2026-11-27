// Runs sent by setup checks rather than by the user's agent: the onboarding
// connection test (`onboarding-<uuid>`) and the SDK setup check (`doctor_<id>`).
const SETUP_CHECK_PREFIXES = ["onboarding-", "doctor_"];

export function isSetupCheckRun(runId: string): boolean {
  return SETUP_CHECK_PREFIXES.some((prefix) => runId.startsWith(prefix));
}

/** The last run in the list that the agent sent, skipping setup checks. */
export function latestAgentRun<T extends { runId: string }>(runs: readonly T[]): T | null {
  return runs.filter((run) => !isSetupCheckRun(run.runId)).at(-1) ?? null;
}
