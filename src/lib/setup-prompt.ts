// The setup prompt people paste into their coding agent. The landing hero and
// the agent setup section both read it from here so the text never drifts.
export const SETUP_STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
] as const;

export const SETUP_AGENTS = ["Claude Code", "Cursor", "Codex"] as const;
export type SetupAgent = (typeof SETUP_AGENTS)[number];

export function setupPrompt(agent?: SetupAgent): string {
  const title = `Set up Uncoil tracing in this project${agent ? ` (${agent})` : ""}.`;
  return `${title}\n\n${SETUP_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
}

export type ClipboardIO = {
  write?: (text: string) => Promise<void>;
  legacy?: (text: string) => boolean;
};

function browserIO(): ClipboardIO {
  return {
    write: typeof navigator !== "undefined" && navigator.clipboard ? (t) => navigator.clipboard.writeText(t) : undefined,
    legacy: (text) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        area.remove();
      }
    },
  };
}

/** Copies text, trying the Clipboard API then the legacy path. Resolves false when both are blocked. */
export async function copyToClipboard(text: string, io: ClipboardIO = browserIO()): Promise<boolean> {
  if (io.write) {
    try {
      await io.write(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }
  return io.legacy ? io.legacy(text) : false;
}
