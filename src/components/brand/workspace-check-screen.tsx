import { UncoilMark } from "./uncoil-mark";

/** Full-screen wait state: a large Dissolve mark, one line of text and a sweeping yellow progress bar. */
export function WorkspaceCheckScreen({ label = "Checking your workspace" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#090909] px-6" role="status" aria-live="polite" aria-label={label}>
      <div className="flex w-full max-w-[520px] flex-col items-end gap-10">
        <div className="relative w-full" aria-hidden="true">
          <UncoilMark className="h-auto w-full text-[#eceae3] opacity-[0.12]" />
          <UncoilMark className="absolute inset-0 h-auto w-full text-[#eceae3] animate-[workspace-wipe_2.2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
        <div className="w-full">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#eceae3]">{label}</p>
          <div className="mt-4 h-1.5 w-full overflow-hidden bg-[#eceae3]/15" aria-hidden="true">
            <div className="h-full w-1/3 bg-[#f4d44d] animate-[workspace-sweep_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
          </div>
        </div>
      </div>
      <style>{`@keyframes workspace-wipe{0%{clip-path:inset(0 100% 0 0)}60%,100%{clip-path:inset(0 0 0 0)}}@keyframes workspace-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
