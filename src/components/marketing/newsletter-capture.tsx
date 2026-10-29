"use client";

import { useId, useState } from "react";
import { campaignFor, readStoredReferral } from "@/lib/referral";

type NewsletterCaptureProps = {
  inverse?: boolean;
  /** Where the form sits, kept with the signup so we know which page earned it. */
  source?: string;
};

export function NewsletterCapture({ inverse = false, source = "footer" }: NewsletterCaptureProps) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Newsletter subscriber",
          email,
          intent: "newsletter",
          message: "Newsletter subscription",
          marketingConsent: true,
          sourcePath: window.location.pathname,
          campaign: campaignFor(`newsletter-${source}`, readStoredReferral()),
        }),
      });
      if (!response.ok) throw new Error();
      setState("sent");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") return <p role="status" className="font-mono text-[10px] uppercase">You’re on the list.</p>;
  return (
    <form onSubmit={submit} className={`flex max-w-md border ${inverse ? "border-black/25 bg-white" : "border-white/25"}`}>
      <label htmlFor={id} className="sr-only">Work email for the Uncoil newsletter</label>
      <input
        id={id}
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        className={`min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-[10px] outline-none ${inverse ? "text-black" : "text-white"}`}
      />
      <button disabled={state === "sending"} className={`px-4 font-mono text-[9px] uppercase ${inverse ? "bg-black text-white" : "bg-white text-black"}`}>
        {state === "sending" ? "Sending" : state === "error" ? "Retry" : "Subscribe"}
      </button>
    </form>
  );
}
