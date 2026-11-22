import type { Answer } from "../types";

export const freeOpenSourceMonitoring: Answer = {
  slug: "free-open-source-ai-agent-monitoring",
  question: "Is there a free, open-source way to monitor AI agents?",
  title: "Free and open-source AI agent monitoring",
  answer:
    "Yes. Uncoil has a free plan, and its code, including the TypeScript and Python SDKs, is released under the MIT license. You can use the hosted free plan or run the application yourself.",
  table: {
    caption: "What the Free plan includes",
    columns: ["Limit", "Free plan"],
    rows: [
      ["Spans per month", "10,000"],
      ["Spans per day", "2,000"],
      ["Projects", "2 per account"],
      ["Members", "1"],
      ["History", "7 days"],
    ],
  },
  points: [
    { heading: "What Free covers", body: "Tracing, the trace viewer and the cost view. Alert rules are part of Pro and Team." },
    { heading: "Self-hosting", body: "The self-hosting guide shows how to build the app from the repository. It needs your own Convex and Tinybird setup, plus authentication and provider keys, so expect some work." },
    { heading: "Other tools", body: "Other options exist. Our comparison page states what we know about them, and the right choice depends on your needs." },
  ],
  link: { href: "/docs/self-hosting", label: "Read the self-hosting guide" },
  related: [
    { href: "/pricing", label: "Pricing" },
    { href: "/docs/plans-and-limits", label: "Plans and limits" },
    { href: "/compare", label: "Compare tools" },
  ],
};
