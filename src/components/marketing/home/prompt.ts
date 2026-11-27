// The setup prompt and the by-hand route. The prompt matches the one the previous homepage hands
// out (src/components/marketing/landing/agent-setup.tsx); the by-hand snippets follow the
// quickstarts in packages/ts-sdk/README.md and packages/python-sdk/README.md (`init()` traces
// OpenAI and Anthropic calls with no wrapping).

export const SETUP_STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
] as const;

export const AGENTS = ["Claude Code", "Cursor", "Codex"] as const;
export type Agent = (typeof AGENTS)[number];

/** The setup prompt, named for one coding agent or for any of them. */
export function promptFor(agent?: Agent) {
  const title = agent ? `Set up Uncoil tracing in this project (${agent}).` : "Set up Uncoil tracing in this project.";
  return `${title}\n\n${SETUP_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

export const BY_HAND = [
  {
    id: "ts",
    label: "TypeScript",
    shell: "npm install @uncoil.dev/sdk\nnpx @uncoil.dev/sdk login",
    code: 'import { init } from "@uncoil.dev/sdk";\n\n// Once, at startup. Every OpenAI and Anthropic call is traced.\ninit();',
    note: "login saves the key to .env.local",
  },
  {
    id: "py",
    label: "Python",
    shell: "pip install uncoil-sdk\nexport UNCOIL_API_KEY=uncoil_sk_live_...",
    code: "import uncoil\n\n# Once, at startup. OpenAI, Anthropic and LangChain calls are traced.\nuncoil.init()",
    note: "copy a key from the API keys page",
  },
] as const;
