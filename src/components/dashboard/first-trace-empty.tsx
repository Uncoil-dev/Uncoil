import type { ReactNode } from "react";
import { EmptyState } from "./empty/empty-state";
import { SampleTrace } from "./empty/samples";

const SNIPPET = `import uncoil
uncoil.init()  # reads UNCOIL_API_KEY`;

/**
 * Shown on a dashboard page when the project has no data at all yet: says what the page will show
 * and points to the one thing that fills it (sending a first trace).
 */
export function FirstTraceEmpty({
  projectId,
  title,
  description,
  showSnippet = true,
  sample,
  eyebrow = "Waiting for your first trace",
}: {
  projectId: string;
  title: string;
  description: string;
  showSnippet?: boolean;
  /** A picture of this page with data. Defaults to a trace waterfall. */
  sample?: ReactNode;
  eyebrow?: string;
}) {
  const base = `/dashboard/${encodeURIComponent(projectId)}`;
  return (
    <div data-testid="first-trace-empty" className="px-3">
      <EmptyState
        eyebrow={eyebrow}
        title={title}
        why={description}
        sample={sample ?? <SampleTrace />}
        action={{ label: "Send your first trace", href: `${base}/quickstart` }}
        secondary={{ label: "Look at the demo", href: "/demo" }}
      >
        {showSnippet ? <pre className="w-full max-w-sm overflow-x-auto border border-[#262C35] bg-[#090909] p-3 text-left font-mono text-xs leading-5 text-[#F4D44D]"><code>{SNIPPET}</code></pre> : null}
      </EmptyState>
    </div>
  );
}
