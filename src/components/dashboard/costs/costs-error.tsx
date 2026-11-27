/** Error bar for a failed Costs load, with a button that fetches again. */
export function CostsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-[#4A2A2A] bg-[#1A1111] px-4 py-2 text-xs text-[#FF8A8A]">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="rounded-md border border-[#5A2A2A] px-2.5 py-1 text-[#E6E9EE] hover:bg-[#2A1A1C]">Try again</button>
    </div>
  );
}
