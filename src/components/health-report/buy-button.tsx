"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

/** Starts the one-off Stripe checkout. No account needed. */
export function BuyButton({ label, kind = "primary" }: { label: string; kind?: "primary" | "secondary" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/health-report/checkout", { method: "POST" });
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout is unavailable right now.");
      window.location.assign(data.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Checkout is unavailable right now.");
      setPending(false);
    }
  }

  const style = kind === "primary"
    ? "bg-[#f4d44d] text-black hover:bg-white"
    : "border border-white/60 bg-black/70 text-white hover:bg-white hover:text-black";
  return (
    <div>
      <button type="button" onClick={() => void buy()} disabled={pending} className={`group inline-flex min-h-12 items-center gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-60 ${style}`}>
        {pending ? "Opening checkout…" : label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </button>
      {error ? <p role="alert" className="mt-3 max-w-sm bg-[#fff4b5] p-3 text-sm text-black">{error}</p> : null}
    </div>
  );
}
