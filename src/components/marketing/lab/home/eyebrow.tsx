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

/** The quiet "what next" link each chapter ends on. */
export function NextStep({ href, on, children, external = false }: { href: string; on: "ink" | "cream"; children: ReactNode; external?: boolean }) {
  return (
    <p className="mt-10 flex justify-end md:mt-12">
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener" } : {})}
        className={`group inline-flex min-h-11 items-center gap-3 border-b ${LABEL} ${
          on === "ink" ? "border-[#eceae3] hover:text-[#f4d44d] focus-visible:outline-[#eceae3]" : "border-[#090909] hover:bg-[#f4d44d] focus-visible:outline-[#090909]"
        } px-1 focus-visible:outline-2 focus-visible:outline-offset-4`}
      >
        {children}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </a>
    </p>
  );
}
