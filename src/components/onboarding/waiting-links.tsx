import Link from "next/link";

/** Links under the listening card: a sample trace, a way to skip, and support once someone is stuck. */
export function WaitingLinks({ elapsed, projectId }: { elapsed: number; projectId: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
      {elapsed >= 30 ? (
        // A new tab keeps this page listening, so the first run is not missed.
        <Link href="/demo" target="_blank" rel="noopener noreferrer" className="text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black">Explore a sample trace while you wait</Link>
      ) : null}
      <Link href={projectId ? `/dashboard/${projectId}/tracing` : "/dashboard"} className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/55 underline underline-offset-4 hover:text-black">Skip for now, I&apos;ll connect later</Link>
      {elapsed >= 120 ? (
        <a href="mailto:support@uncoil.dev" className="text-sm text-black/60 underline underline-offset-4 transition-colors hover:text-black">Still stuck? Email support</a>
      ) : null}
    </div>
  );
}
