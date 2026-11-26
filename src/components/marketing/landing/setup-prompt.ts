/** The setup prompt a visitor pastes into their coding agent. Shared by the landing section and the phone menu. */

// PLACEHOLDER prompt: swap in the tested text from the "Write the agent setup prompt" work when it lands.
const STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
];

export const AGENTS = ["Claude Code", "Cursor", "Codex"] as const;
export type Agent = (typeof AGENTS)[number];

export function promptFor(agent: Agent) {
  return `Set up Uncoil tracing in this project (${agent}).\n\n${STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

/** The prompt for the default agent, as the landing section shows it first. */
export const SETUP_PROMPT = promptFor(AGENTS[0]);
