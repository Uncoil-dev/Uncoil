import type { ReactNode } from "react";
import { LABEL } from "./ui";

/** The section marker every chapter opens with: number, a full-strength rule, chapter name. */
export function Eyebrow({ n, on, children, className = "" }: { n: string; on: "ink" | "cream"; children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-4 ${LABEL} ${className}`}>
      <span className="tabular-nums">{n}</span>
      <span aria-hidden="true" className={`h-px flex-1 ${on === "ink" ? "bg-[#eceae3]" : "bg-[#090909]"}`} />
      <span>{children}</span>
    </p>
  );
}
