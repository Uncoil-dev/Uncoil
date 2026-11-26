// Chapters of the page and which one is being read, kept pure so it can be tested.

export const CHAPTERS = [
  ["break", "Where it broke"],
  ["trace", "The trace"],
  ["cost", "What it cost"],
  ["fix", "Fix and verify"],
  ["pw-setup", "Setup"],
  ["kit", "What you get"],
  ["price", "Price"],
  ["faq", "Questions"],
] as const;

/** Index of the chapter whose top has passed 40% of the screen, -1 above the first one. */
export function chapterAt(tops: readonly number[], line: number) {
  let at = -1;
  tops.forEach((top, i) => {
    if (top <= line) at = i;
  });
  return at;
}

