import Link from "next/link";
import { PixelArt } from "./pixel-art";

type Tone = "dark" | "paper";

const TONES: Record<Tone, { box: string; title: string; text: string; button: string }> = {
  dark: { box: "border-[#262C35] bg-[#0E1115]", title: "text-[#E6E9EE]", text: "text-[#9AA2AF]", button: "bg-[#F4D44D] text-[#090909] hover:bg-[#f7de70] focus-visible:ring-[#F4D44D]" },
  paper: { box: "border-black/15 bg-[#f3f2ed]", title: "text-black", text: "text-black/60", button: "bg-[#090909] text-[#eceae3] hover:bg-black/80 focus-visible:ring-black" },
};

const BUTTON = "inline-flex h-9 items-center gap-2 px-4 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/**
 * Compact empty state for a panel or list that has no rows: pixel art, one line on what is missing
 * and one next step. Use `filtered` art when data exists but the current filters hide it.
 */
export function EmptyNotice({ tone = "dark", art = "empty", title, description, href, onClick, action, testId }: {
  tone?: Tone;
  art?: "empty" | "filtered";
  title: string;
  description: string;
  action?: string;
  href?: string;
  onClick?: () => void;
  testId?: string;
}) {
  const t = TONES[tone];
  return (
    <div data-testid={testId ?? "empty-notice"} className={`flex flex-col items-center gap-4 border px-6 py-10 text-center ${t.box}`}>
      <PixelArt kind={art} />
      <p className={`font-mono text-xs uppercase tracking-widest ${t.title}`}>{title}</p>
      <p className={`max-w-md text-sm leading-6 ${t.text}`}>{description}</p>
      {action && href ? <Link href={href} className={`${BUTTON} ${t.button}`}>{action}<span aria-hidden="true">→</span></Link> : null}
      {action && !href && onClick ? <button type="button" onClick={onClick} className={`${BUTTON} ${t.button}`}>{action}<span aria-hidden="true">→</span></button> : null}
    </div>
  );
}
