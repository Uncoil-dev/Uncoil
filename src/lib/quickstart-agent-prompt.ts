export type QuickstartLang = "python" | "typescript";

/** The prompt the in-app quickstart copies for a coding agent. Mirrors the steps on the agent setup docs page. */
export function buildAgentPrompt({ lang, region }: { lang: QuickstartLang; region: string }): string {
  const python = lang === "python";
  const login = `npx @uncoil.dev/sdk login${region === "us" ? " --region us" : ""}`;
  const install = python
    ? "pip install uncoil-sdk (use the project's own tool, such as uv or poetry, if it has one)"
    : "npm install @uncoil.dev/sdk (use the project's own package manager: npm, pnpm, yarn or bun)";
  const tracing = python
    ? "Call uncoil.init() once at startup, before the first model call:\n     import uncoil\n     uncoil.init()"
    : 'Call init() once at startup, before the first model call:\n     import { init } from "@uncoil.dev/sdk";\n     await init().ready;';
  const loadKey = python
    ? "Python does not read .env.local by itself: load it with python-dotenv or export the variables."
    : "Next.js and Vite load .env.local on their own. For plain Node run scripts with: node --env-file=.env.local <file>.";
  const doctor = python ? "uncoil-doctor" : "npx @uncoil.dev/sdk doctor";
  // Only the TypeScript setup check prints which project the traces go to.
  const doctorPass = python ? "It must send one test trace." : 'It must name the project under "Traces will land in" and send one test trace.';

  return `Set up Uncoil tracing in this project. Uncoil records every model call and tool call of an AI agent so I can debug it. Follow these steps in order and stop to tell me if one fails.

1. Look at the project first: which model SDK does it use (openai, Anthropic, LangChain or something else)? Tell me in one line.
2. Install: ${install}
3. Sign me in. Run: ${login}
   It prints a web address and a short code. Show both to me and wait while I approve it in the browser. It writes UNCOIL_API_KEY and UNCOIL_PROJECT_ID into .env.local. Never ask me to paste a key, and never invent or hard-code one.
4. Check that .env.local is in .gitignore. Never print or commit it. ${loadKey}
5. Add tracing. ${tracing}
   Do not add it twice. Never put the key in browser or client code.
6. Check the setup. Run: ${doctor}
   ${doctorPass} If it fails, fix the cause and run it again.
7. Run the agent once for real, then tell me which files you changed and where to see the trace.`;
}
