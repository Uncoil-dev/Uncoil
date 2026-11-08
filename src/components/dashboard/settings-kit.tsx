"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Small building blocks shared by the project settings panels, so they match the rest of the dark dashboard. */
export const card = "border border-[#262C35] bg-[#0E1115]";
export const eyebrow = "font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]";
export const field = "w-full border border-[#262C35] bg-[#0B0D10] px-3 py-2 font-mono text-[12px] text-[#E6E9EE] outline-none placeholder:text-[#566070] focus:border-[#F4D44D]";
export const label = "grid gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8B93A1]";

export function PanelHeading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <p className={eyebrow}>{kicker}</p>
      <h3 className="mt-2 font-pixel text-3xl tracking-[-0.05em] text-[#E6E9EE]">{title}</h3>
      {children ? <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#8B93A1]">{children}</p> : null}
    </header>
  );
}

export function Button({ tone = "plain", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "plain" | "primary" | "danger" }) {
  const tones = {
    plain: "border-[#262C35] !bg-transparent !text-[#E6E9EE] hover:border-[#F4D44D]",
    primary: "border-[#F4D44D] !bg-[#F4D44D] !text-[#0B0D10] hover:!bg-[#fff4b5]",
    danger: "border-[#5a2a2a] !bg-transparent !text-[#ff9d9d] hover:border-[#ff9d9d]",
  };
  return <button type="button" {...props} className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`} />;
}

export function Notice({ text, bad }: { text: string; bad?: boolean }) {
  if (!text) return null;
  return <p role="status" className={`border px-3 py-2 font-mono text-[11px] ${bad ? "border-[#5a2a2a] text-[#ff9d9d]" : "border-[#F4D44D]/40 text-[#F4D44D]"}`}>{text}</p>;
}

export function cleanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/Uncaught Error: ([^\n]+)/);
  return match?.[1] ?? (message && !message.includes("[CONVEX") ? message : fallback);
}

export function usd(value: number) {
  if (value === 0) return "$0";
  return value < 0.01 ? `$${value.toFixed(6).replace(/0+$/, "")}` : `$${value.toFixed(value < 1 ? 4 : 2)}`;
}
