import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/** Shared frame for the checkout pages: slim header (logo + one way back) and a dark/cream split. No site navbar, no footer. */
export function CheckoutShell({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-[#090909] text-black">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-5 text-[#eceae3] md:px-10">
        <BrandLogo className="text-lg" />
        <Link href="/pricing" className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 underline underline-offset-4 hover:text-[#f4d44d]">← Back to pricing</Link>
      </header>
      <div className="grid flex-1 lg:grid-cols-[5fr_7fr]">
        <aside className="relative isolate order-2 flex flex-col justify-between overflow-hidden px-5 pb-12 pt-10 text-[#eceae3] md:px-10 lg:order-1 lg:pt-14">
          <Image src="/images/landing/checkout-gate.png" alt="" fill priority unoptimized sizes="(min-width: 1024px) 42vw, 100vw" className="-z-10 object-cover opacity-50 [image-rendering:pixelated] lg:opacity-80" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#090909] via-[#090909]/70 to-[#090909]/20" aria-hidden="true" />
          {aside}
        </aside>
        <section className="order-1 bg-[#eceae3] px-5 pb-16 pt-10 md:px-10 lg:order-2 lg:px-16 lg:pt-16">
          <div className="mx-auto max-w-xl">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function TrustRow() {
  return (
    <ul className="mt-6 grid gap-2 font-mono text-[10px] uppercase leading-4 tracking-[0.1em] text-black/65 sm:grid-cols-3">
      {["Cancel any time", "Paid on Stripe, not on Uncoil", "Live the moment you pay"].map((item) => (
        <li key={item} className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 bg-[#f4d44d] outline outline-1 outline-black" />{item}</li>
      ))}
    </ul>
  );
}
