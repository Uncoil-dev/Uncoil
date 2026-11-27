// The setup prompt and the by-hand route. The steps come from the shared setup-prompt module, so the
// homepage, the earlier homepage and the phone menu hand out the same instructions; the by-hand snippets follow the
// quickstarts in packages/ts-sdk/README.md and packages/python-sdk/README.md (`init()` traces
// OpenAI and Anthropic calls with no wrapping).

import { SETUP_STEPS } from "../landing/setup-prompt.ts";

export { SETUP_STEPS };

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
