import type { FrameworkSetup } from "@/lib/framework-setups";

const kindLabel = { agent: "Run", llm: "Model", tool: "Tool" } as const;

/** Example run drawn as a waterfall, so a reader sees what the setup produces before they install anything. */
export function SampleTrace({ name, rows }: { name: string; rows: FrameworkSetup["sample"] }) {
  return (
    <figure className="border border-white/20 bg-[#090909] text-[#eceae3]">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
        <span>What you see in Uncoil / {name}</span>
        <span>Example run, not real data</span>
      </figcaption>
      <ol className="divide-y divide-white/10">
        {rows.map((row, i) => (
          <li key={row.label} className="grid items-center gap-2 px-5 py-3 md:grid-cols-[minmax(0,260px)_1fr] md:gap-6">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="font-pixel text-xl leading-none text-white/30">{String(i + 1).padStart(2, "0")}</span>
              <span className="truncate font-mono text-xs">{row.label}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 md:ml-0">{kindLabel[row.kind]}</span>
            </div>
            <div className="relative h-4 bg-white/[0.06]" aria-hidden="true">
              <span
                className={`absolute inset-y-0 ${row.kind === "llm" ? "bg-[#f4d44d]" : row.kind === "tool" ? "bg-[#eceae3]" : "border border-white/60 bg-white/10"}`}
                style={{ left: `${row.start}%`, width: `${row.width}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
