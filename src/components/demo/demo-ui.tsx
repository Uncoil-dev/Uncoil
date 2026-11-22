import { PageTitle } from "@/components/dashboard/page-title";
import Link from "next/link";

import { DEMO_BASE_PATH, DEMO_PROJECT_NAME } from "@/lib/demo/demo-config";

export const panel = "border border-[#1F242C] bg-[#0E1115]";

/** Page header in the Tracing page's style: title, project, then page actions on the right. */
export function DemoHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[#1F242C] py-2.5 pl-11 pr-4">
      <PageTitle>{title}</PageTitle>
      <span className="font-mono text-xs text-[#8B93A1]">{DEMO_PROJECT_NAME}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </header>
  );
}

export function RangeLinks({ base, days, options }: { base: string; days: number; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div role="group" aria-label="Time range" className="flex border border-[#262C35] p-0.5 text-xs">
      {options.map(([value, label], index) => (
        <Link key={value} href={index === 0 ? base : `${base}?range=${value}`} aria-current={String(days) === value ? "true" : undefined}
          className={`flex h-6 items-center px-2.5 ${String(days) === value ? "bg-[#232A34] !text-white" : "!text-[#8B93A1] hover:!text-white"}`}>{label}</Link>
      ))}
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#0B0D10] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">{children}</div>;
}

export function Table({ head, rows, empty }: { head: ReadonlyArray<string | { label: string; right?: boolean }>; rows: React.ReactNode[][]; empty?: string }) {
  const cell = (h: string | { label: string; right?: boolean }) => (typeof h === "string" ? { label: h, right: false } : { label: h.label, right: Boolean(h.right) });
  const heads = head.map(cell);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead className="font-mono text-[11px] text-[#6B7380]"><tr>{heads.map((h) => <th key={h.label} className={`px-3 py-1.5 font-normal ${h.right ? "text-right" : ""}`}>{h.label}</th>)}</tr></thead>
        <tbody className="text-xs">
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#1F242C] hover:bg-[#111418]">
              {row.map((value, j) => <td key={j} className={`px-3 py-2 ${heads[j]?.right ? "text-right font-mono text-[#C9CED6]" : ""}`}>{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <p className="px-3 py-6 text-center text-xs text-[#6B7380]">{empty ?? "Nothing here yet."}</p> : null}
    </div>
  );
}

export const tracingLink = (query: string) => `${DEMO_BASE_PATH}/tracing?${query}`;
