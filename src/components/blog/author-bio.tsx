export function AuthorBio({ author }: { author: string }) {
  if (!author) return null;

  return (
    <div className="grid overflow-hidden border border-black sm:grid-cols-[112px_1fr]">
      <div className="flex min-h-24 items-center justify-center border-b border-black bg-[#f4d44d] sm:border-b-0 sm:border-r">
        <span aria-hidden="true" className="font-pixel text-5xl leading-none tracking-[-0.08em]">
          T/
        </span>
      </div>
      <div className="flex flex-col justify-center bg-[#f3f1ea] px-5 py-5 sm:px-7">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-black/60">
          Written by
        </span>
        <span className="mt-2 font-pixel text-2xl leading-none tracking-[-0.03em] text-black">
          {author}
        </span>
        <p className="mt-2 max-w-lg text-sm leading-6 text-black/60">
          Practical field notes from the team building Uncoil and operating AI agents in production.
        </p>
      </div>
    </div>
  );
}
