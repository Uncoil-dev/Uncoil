/** Error box for a failed Tracing load, shared by the list and Chart views so both can retry in place. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="my-6 rounded-lg border border-[#5A2A2A] bg-[#1E1314] p-4 text-sm">
      <p className="font-medium text-[#FF8A8A]">{message}</p>
      <button type="button" className="mt-3 rounded-md border border-[#5A2A2A] px-3 py-1.5 text-xs hover:bg-[#2A1A1C]" onClick={onRetry}>Try again</button>
    </div>
  );
}
