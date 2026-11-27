// The setup prompt visitors paste into their coding agent. The homepage setup section and the
// phone menu both copy it from here, so the two always hand out the same instructions.

// PLACEHOLDER prompt: swap in the tested text from the "Write the agent setup prompt" work when it lands.
export const SETUP_STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
] as const;

/** The prompt for one coding agent, named in its first line. */
export function promptFor(agent: string) {
  return `Set up Uncoil tracing in this project (${agent}).\n\n${SETUP_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

/** The default prompt, for places that do not ask which agent you use. */
export const SETUP_PROMPT = promptFor("Claude Code");
