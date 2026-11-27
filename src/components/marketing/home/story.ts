// Pure logic for the homepage, shared by the components and the tests: the setup prompt's lines.

// ── Setup prompt ─────────────────────────────────────────────────────────────────────────────

/**
 * The setup prompt split for display. The prompt numbers its own steps ("1. Install…"), so those
 * numbers are lifted out to be styled and nothing else is numbered: one numbering, the prompt's.
 */
export function promptLines(text: string) {
  return text.split("\n").map((line) => {
    const m = /^(\d+)\.\s+(.*)$/.exec(line);
    return m ? { num: m[1], text: m[2] } : { num: "", text: line };
  });
}
