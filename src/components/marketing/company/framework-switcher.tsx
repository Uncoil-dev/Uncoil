import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { frameworkSetups } from "@/lib/framework-setups";

/** The four five-minute framework setups, as cards. `current` highlights the page you are on. */
export function FrameworkSwitcher({ current, dark = false }: { current?: string; dark?: boolean }) {
  return (
    <ul className="grid gap-px border-2 border-black bg-black sm:grid-cols-2 lg:grid-cols-4">
      {frameworkSetups.map((f) => {
        const active = f.slug === current;
        return (
          <li key={f.slug} className={dark ? "bg-[#090909]" : "bg-[#eceae3]"}>
            <Link
              href={`/integrations/${f.slug}`}
              aria-current={active ? "page" : undefined}
              className={`group flex h-full min-h-40 flex-col justify-between gap-6 p-5 transition-colors ${active ? "bg-[#f4d44d] text-black" : dark ? "text-[#eceae3] hover:bg-[#f4d44d] hover:text-black" : "text-black hover:bg-[#f4d44d]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-pixel text-3xl leading-[0.9] tracking-[-0.06em]">{f.name}</span>
                <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-60">{f.language}</p>
                <p className="mt-2 font-mono text-xs">5 minutes / <span className="opacity-70">{f.line}</span></p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
