import Link from "next/link";

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
}: {
  projectId: string;
  title: string;
  description: string;
  showSnippet?: boolean;
}) {
  const base = `/dashboard/${encodeURIComponent(projectId)}`;
  return (
    <div className="mx-auto my-10 w-full max-w-xl border border-[#262C35] bg-[#0E1115] p-8 text-center" data-testid="first-trace-empty">
      <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center bg-[#F4D44D]" aria-hidden="true">
        <span className="size-2 animate-pulse bg-[#090909]" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F4D44D]">Waiting for your first trace</p>
      <h2 className="mt-2 text-base font-semibold text-[#E6E9EE]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8B93A1]">{description}</p>
      {showSnippet ? <pre className="mx-auto mt-5 max-w-sm overflow-x-auto border border-[#262C35] bg-[#090909] p-3 text-left font-mono text-xs leading-5 text-[#F4D44D]"><code>{SNIPPET}</code></pre> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href={`${base}/quickstart`} className="h-9 bg-[#F4D44D] px-4 text-sm font-medium leading-9 text-[#090909] hover:bg-[#f7de70]">Send your first trace</Link>
        <Link href="/demo" className="h-9 border border-[#262C35] px-4 text-sm leading-9 text-[#C9CED6] hover:text-white">Look at the demo</Link>
      </div>
    </div>
  );
}
