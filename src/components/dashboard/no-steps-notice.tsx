/** Shown when a finished run has no recorded steps. */
export function NoStepsNotice() {
  return (
    <div className="border border-dashed border-border p-8 text-center">
      <div className="font-mono text-[11px] uppercase tracking-widest text-black/55">
        No steps recorded for this run
      </div>
      <p className="mt-2 text-xs text-black/55">
        Steps can take a few seconds to arrive. If they never show up, run the connection check in setup to see what is wrong.
      </p>
    </div>
  );
}
