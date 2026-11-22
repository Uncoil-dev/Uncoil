import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, KeyRound, Settings2, SlidersHorizontal } from "lucide-react";

export type AdminSection = "billing" | "api-keys" | "manage";

const NAV = [
  { id: "billing", label: "Billing", hint: "Plan and usage", href: "billing", icon: CreditCard },
  { id: "api-keys", label: "API keys", hint: "Ingest access", href: "api-keys", icon: KeyRound },
  { id: "manage", label: "Manage", hint: "Project and limits", href: "manage", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", hint: "Name, members, data", href: "settings", icon: Settings2 },
] as const;

/** Page frame for the project admin pages: a small section menu on the left, the page content on the right. */
export function AdminShell({ projectId, active, children }: { projectId: string; active: AdminSection; children: ReactNode }) {
  return (
    <div className="grid max-w-6xl gap-6 px-6 pb-20 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Project admin" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV.map(({ id, label, hint, href, icon: Icon }) => {
          const on = id === active;
          return (
            <Link
              key={id}
              href={`/dashboard/${projectId}/${href}`}
              aria-current={on ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-2 transition-colors ${on ? "border-[#F4D44D] bg-[#111418]" : "border-transparent hover:bg-[#111418]"}`}
            >
              <Icon className={`size-4 shrink-0 ${on ? "text-[#F4D44D]" : "text-[#6B7380]"}`} aria-hidden />
              <span className="grid">
                <span className={`font-mono text-[11px] uppercase tracking-[0.12em] ${on ? "text-[#E6E9EE]" : "text-[#8B93A1]"}`}>{label}</span>
                <span className="text-[11px] text-[#6B7380] max-lg:hidden">{hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

/** A titled panel with an optional action in the header. */
export function Panel({ title, hint, action, tone = "plain", children }: { title: string; hint?: string; action?: ReactNode; tone?: "plain" | "danger"; children: ReactNode }) {
  return (
    <section className={`border ${tone === "danger" ? "border-[#5a2a2a] bg-[#150f10]" : "border-[#262C35] bg-[#0E1115]"}`}>
      <header className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 ${tone === "danger" ? "border-[#5a2a2a]" : "border-[#1F242C]"}`}>
        <div className="min-w-0">
          <h2 className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === "danger" ? "text-[#FF8A8A]" : "text-[#E6E9EE]"}`}>{title}</h2>
          {hint ? <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#8B93A1]">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border border-[#262C35] bg-[#0E1115] px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">{label}</div>
      <div className="mt-2 font-mono text-2xl text-[#E6E9EE]">{value}</div>
      {detail ? <div className="mt-1 font-mono text-[11px] text-[#6B7380]">{detail}</div> : null}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#1F242C] py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8B93A1]">{label}</dt>
      <dd className="min-w-0 truncate text-right font-mono text-[12px] text-[#E6E9EE]">{value}</dd>
    </div>
  );
}

export const adminButton = "inline-flex items-center justify-center gap-2 border border-[#262C35] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#E6E9EE] transition-colors hover:border-[#F4D44D] disabled:cursor-not-allowed disabled:opacity-40";
export const adminButtonPrimary = "inline-flex items-center justify-center gap-2 border border-[#F4D44D] bg-[#F4D44D] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#0B0D10] transition-colors hover:bg-[#fff4b5] disabled:cursor-not-allowed disabled:opacity-40";
