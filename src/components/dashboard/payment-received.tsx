import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/** Shown on the billing page right after Stripe checkout for an existing project. */
export function PaymentReceived({ projectId }: { projectId: string }) {
  const base = `/dashboard/${projectId}`;
  const steps = [
    { n: "1", title: "Your plan is on", body: "Higher limits are live now. Nothing to set up." },
    { n: "2", title: "Keep sending traces", body: "Your current API key still works. No change needed." },
    { n: "3", title: "Get your receipt", body: "Stripe emailed it. You can also manage your plan below." },
  ];
  return (
    <section aria-labelledby="payment-received" className="border-2 border-black bg-[#fff4b5] text-black">
      <div className="flex items-start justify-between gap-4 border-b-2 border-black p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">Payment received</p>
          <h2 id="payment-received" className="mt-2 font-pixel text-4xl leading-[0.9] tracking-[-0.07em]">Thank you. You&apos;re all set.</h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center bg-black text-[#f4d44d]"><Check className="size-5" aria-hidden="true" /></span>
      </div>
      <ol className="grid gap-px bg-black sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="bg-[#fff4b5] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em]">{s.n}. {s.title}</p>
            <p className="mt-2 text-sm leading-6 text-black/75">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3 border-t-2 border-black p-5">
        <Link href={`${base}/runs`} className="group inline-flex min-h-11 items-center gap-3 bg-black px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d]">See my runs <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
        <Link href={`${base}/billing`} className="inline-flex min-h-11 items-center border-2 border-black px-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#fff4b5]">Close</Link>
      </div>
    </section>
  );
}
