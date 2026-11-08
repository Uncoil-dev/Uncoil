import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "dark" | "paper";

export type EmptyAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

const TONES: Record<Tone, { shell: string; eyebrow: string; title: string; why: string; frame: string; frameBar: string; frameTag: string; fade: string; button: string; ghost: string }> = {
  dark: {
    shell: "border-[#262C35] bg-[#0E1115]",
    eyebrow: "text-[#F4D44D]",
    title: "text-[#E6E9EE]",
    why: "text-[#9AA2AF]",
    frame: "border-[#262C35] bg-[#0B0D10]",
    frameBar: "border-[#1F242C] bg-[#11151A] text-[#6B7380]",
    frameTag: "bg-[#F4D44D] text-[#090909]",
    fade: "from-transparent to-[#0B0D10]",
    button: "bg-[#F4D44D] text-[#090909] hover:bg-[#f7de70] focus-visible:ring-[#F4D44D]",
    ghost: "text-[#8AB4FF] hover:text-white",
  },
  paper: {
    shell: "border-black/15 bg-[#f3f2ed]",
    eyebrow: "text-black/70",
    title: "text-black",
    why: "text-black/60",
    frame: "border-black/15 bg-[#eceae3]",
    frameBar: "border-black/10 bg-[#e4e1d7] text-black/50",
    frameTag: "bg-[#090909] text-[#eceae3]",
    fade: "from-transparent to-[#eceae3]",
    button: "bg-[#090909] text-[#eceae3] hover:bg-black/80 focus-visible:ring-black",
    ghost: "text-black/70 hover:text-black",
  },
};

const BUTTON_BASE = "inline-flex h-9 items-center gap-2 px-4 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/**
 * The one empty state every dashboard page uses when it has no data yet. It always has the same three
 * parts: a labelled sample of what the page will look like, one line on why it matters, and one button.
 * The sample is decorative (hidden from assistive tech, not focusable) and clearly marked as not real data.
 */
export function EmptyState({
  tone = "dark",
  eyebrow,
  title,
  why,
  sample,
  sampleLabel = "Sample · not your data",
  action,
  secondary,
  children,
  testId,
}: {
  tone?: Tone;
  eyebrow: string;
  title: string;
  /** One line on why this page is worth filling. */
  why: string;
  sample: ReactNode;
  sampleLabel?: string;
  action?: EmptyAction;
  secondary?: { label: string; href: string };
  /** Extra content above the button, or the one action itself when it is a form ("name your first dataset"). */
  children?: ReactNode;
  testId?: string;
}) {
  const t = TONES[tone];
  const buttonClass = `${BUTTON_BASE} ${t.button}`;
  return (
    <section data-testid={testId ?? "empty-state"} aria-label={`${eyebrow}: nothing here yet`} className={`mx-auto my-6 grid w-full max-w-5xl gap-0 border md:my-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${t.shell}`}>
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
        <p className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] ${t.eyebrow}`}>
          <span aria-hidden="true" className="grid grid-cols-3 gap-px"><i className="size-[3px] bg-current" /><i className="size-[3px] bg-current opacity-60" /><i className="size-[3px] bg-current opacity-30" /></span>
          {eyebrow}
        </p>
        <h2 className={`text-balance text-xl font-semibold leading-snug tracking-tight sm:text-2xl ${t.title}`}>{title}</h2>
        <p className={`max-w-md text-sm leading-6 ${t.why}`}>{why}</p>
        {children ? <div className="min-w-0">{children}</div> : null}
        {action || secondary ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            {action ? (action.href !== undefined
              ? <Link href={action.href} className={buttonClass}>{action.label}<span aria-hidden="true">→</span></Link>
              : <button type="button" onClick={action.onClick} className={buttonClass}>{action.label}<span aria-hidden="true">→</span></button>) : null}
            {secondary ? <Link href={secondary.href} className={`font-mono text-[11px] underline underline-offset-4 ${t.ghost}`}>{secondary.label}</Link> : null}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0 lg:p-6 lg:pl-0">
        <div className={`relative h-full min-h-[220px] overflow-hidden border ${t.frame}`}>
          <div className={`flex items-center justify-between border-b px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] ${t.frameBar}`}>
            <span className="flex gap-1" aria-hidden="true"><i className="size-1.5 bg-current opacity-40" /><i className="size-1.5 bg-current opacity-25" /><i className="size-1.5 bg-current opacity-15" /></span>
            <span className={`px-1.5 py-0.5 ${t.frameTag}`}>{sampleLabel}</span>
          </div>
          <div aria-hidden="true" {...{ inert: true }} className="pointer-events-none select-none p-3 sm:p-4">{sample}</div>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b ${t.fade}`} />
        </div>
      </div>
    </section>
  );
}
