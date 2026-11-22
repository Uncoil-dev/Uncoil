export type Answer = {
  slug: string;
  /** The question as people type it into a search box. */
  question: string;
  /** Short title used in the page title and hub cards. */
  title: string;
  /** One or two sentences that answer the question straight away. */
  answer: string;
  /** Short points that back the answer up. */
  points: readonly { heading: string; body: string }[];
  /** Optional numbered steps, shown before the points. */
  steps?: readonly { heading: string; body: string }[];
  /** Optional small table, shown after the steps. */
  table?: { caption: string; columns: readonly string[]; rows: readonly (readonly string[])[] };
  link: { href: string; label: string };
  related: readonly { href: string; label: string }[];
};
