// Data for the "what you get" inventory: one pixel sprite and one plain fact per item. Every
// fact comes from the live product copy; sample values are labelled as examples on the page.

export const SPRITE = 12;

type Sprite = readonly string[];

const LAYERS: Sprite = [
  "............",
  "..########..",
  "..#......#..",
  "..########..",
  "............",
  "..yyyyyyyy..",
  "..y......y..",
  "..yyyyyyyy..",
  "............",
  "..########..",
  "..#......#..",
  "..########..",
];

const LENS: Sprite = [
  "............",
  "..#####.....",
  ".#.....#....",
  "#..yy...#...",
  "#..y....#...",
  "#.......#...",
  ".#.....#....",
  "..#####.##..",
  ".........##.",
  "..........##",
  "...........#",
  "............",
];


const LOCK: Sprite = [
  "............",
  "....####....",
  "...#....#...",
  "...#....#...",
  "...#....#...",
  "..########..",
  "..#......#..",
  "..#..yy..#..",
  "..#..yy..#..",
  "..#......#..",
  "..########..",
  "............",
];

const LOOP: Sprite = [
  "............",
  "....####....",
  "..##....##..",
  ".#........#.",
  ".#.......yyy",
  ".#........y.",
  ".#..........",
  ".#........#.",
  "..##....##..",
  "....####....",
  "............",
  "............",
];


const PAGE: Sprite = [
  "..#######...",
  "..#.....##..",
  "..#.....#.#.",
  "..#.yyy.###.",
  "..#.......#.",
  "..#.#####.#.",
  "..#.......#.",
  "..#.###...#.",
  "..#.......#.",
  "..#.####..#.",
  "..#.......#.",
  "..#########.",
];

const BELL: Sprite = [
  ".....yy.....",
  "....####....",
  "...#....#...",
  "..#......#..",
  "..#......#..",
  "..#......#..",
  "..#......#..",
  ".#........#.",
  "############",
  "............",
  ".....yy.....",
  "............",
];


export type KitItem = { id: string; title: string; body: string; sample: readonly string[]; sprite: Sprite };

export const KIT: readonly KitItem[] = [
  { id: "steps", title: "Every step kept", body: "Each model call, tool call and retrieval is recorded with what went in, what came out, the model, tokens, cost, latency and the step that called it.", sample: ["input", "output", "model", "tokens", "cost", "ms", "parent"], sprite: LAYERS },
  { id: "alerts", title: "Hear about it first", body: "On Pro, alerts watch failed runs, spend, slow runs and runs that stop arriving, and reach you by email or Slack.", sample: ["failed runs > 5 / hour", "spend > $30 / day", "email", "Slack"], sprite: BELL },
  { id: "search", title: "Search like you think", body: "Filter runs by status, cost, latency or tokens. Exclude with a minus.", sample: ["status:error", "cost>0.05", "latency>3s", "-env:dev"], sprite: LENS },
  { id: "secrets", title: "Secrets stay home", body: "The SDKs strip common key, token, JWT and password patterns from inputs and outputs before anything is sent.", sample: ["Authorization: Bearer", "→ [stripped]"], sprite: LOCK },
  { id: "loops", title: "Loops make sense", body: "Nested steps keep their parent, so a five-turn loop reads as five turns, not fifty lines.", sample: ["turn 1", "turn 2", "turn 3", "turn 4", "turn 5"], sprite: LOOP },
  { id: "report", title: "A report you can print", body: "One page per project: where the money went, what broke and which steps were slowest.", sample: ["cost", "errors", "slow steps"], sprite: PAGE },
];

/** One SVG path per colour for a sprite, merging horizontal runs of the same colour. */
export function spritePaths(sprite: Sprite) {
  const out = { cream: "", yellow: "" };
  sprite.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let end = x;
      while (end + 1 < row.length && row[end + 1] === c) end++;
      const run = `M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`;
      if (c === "#") out.cream += run;
      if (c === "y") out.yellow += run;
      x = end + 1;
    }
  });
  return out;
}
