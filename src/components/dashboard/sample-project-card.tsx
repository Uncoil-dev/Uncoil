"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { DEMO_BASE_PATH, DEMO_PROJECT_NAME } from "@/lib/demo/demo-config";
import { useSampleProjectHidden } from "@/lib/demo/sample-project-state";

/** Offers the read-only sample project on the empty start screen. Hidden for good once the user dismisses it. */
export function SampleProjectCard() {
  const [hidden, setHidden] = useSampleProjectHidden();

  if (hidden) {
    return (
      <button type="button" onClick={() => setHidden(false)} className="mt-4 self-start font-mono text-[11px] text-black/55 underline-offset-4 hover:text-black hover:underline">
        Show the sample project again
      </button>
    );
  }

  return (
    <section aria-label="Sample project" data-testid="sample-project-card" className="mt-4 grid gap-4 border border-black bg-white p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-black/55">
          <span className="bg-[#f4d44d] px-1.5 py-0.5 text-[#090909]">Sample</span> · not your data
        </p>
        <h2 className="mt-2 font-mono text-[15px] text-black">Look around first: {DEMO_PROJECT_NAME}</h2>
        <p className="mt-1 max-w-xl font-sans text-sm leading-6 text-black/60">
          A support agent with real-looking runs, costs and errors. Open a failed run and see what went wrong. It is view only, it does not count toward your limits, and you can hide it any time.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={DEMO_BASE_PATH} className={buttonVariants({ variant: "default", className: "h-9 px-4 uppercase" })}>Open sample project</Link>
        <button type="button" onClick={() => setHidden(true)} className="font-mono text-[11px] text-black/55 underline-offset-4 hover:text-black hover:underline">Hide</button>
      </div>
    </section>
  );
}
