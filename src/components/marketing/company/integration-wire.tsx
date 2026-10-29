/** Connection diagram for an integration page: your code on the left, Uncoil on the right, captured fields on the wire. */
export function IntegrationWire({ name, captures }: { name: string; captures: readonly string[] }) {
  return (
    <div className="border-2 border-black bg-[#eceae3] p-5 text-black md:p-10">
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,220px)_1fr_minmax(0,220px)]">
        <div className="border-2 border-black bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">Your code</p>
          <p className="mt-3 font-pixel text-4xl leading-[0.9] tracking-[-0.06em]">{name}</p>
        </div>
        <div aria-hidden="true" className="relative hidden h-10 md:block">
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-[repeating-linear-gradient(90deg,#090909_0_8px,transparent_8px_14px)]" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="wire-packet absolute top-1/2 size-2.5 -translate-y-1/2 bg-[#f4d44d] shadow-[0_0_0_2px_#090909]" style={{ animation: "wire-packet 3.2s linear infinite", animationDelay: `${i * 0.8}s` }} />
          ))}
        </div>
        <div className="border-2 border-black bg-[#090909] p-5 text-[#eceae3]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f4d44d]">Uncoil</p>
          <p className="mt-3 font-pixel text-4xl leading-[0.9] tracking-[-0.06em]">One run.</p>
        </div>
      </div>
      <ul className="mt-8 grid gap-px border-2 border-black bg-black sm:grid-cols-2">
        {captures.map((c, i) => (
          <li key={c} className="flex gap-4 bg-[#eceae3] p-5 text-sm leading-6 transition-colors hover:bg-[#f4d44d]">
            <span className="font-pixel text-2xl leading-none">{String(i + 1).padStart(2, "0")}</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
