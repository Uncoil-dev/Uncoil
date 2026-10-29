import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

/** Full-bleed dark frame for the region and mode steps: logo bar, pixel art panel, step content. */
export function CloudShell({
  step,
  eyebrow,
  title,
  body,
  image,
  footer,
  children,
}: {
  step: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#090909] text-[#eceae3] selection:bg-[#f4d44d] selection:text-black">
      <header className="flex h-16 items-center justify-between border-b border-white/15 px-5 md:px-8">
        <Link href={process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.uncoil.dev"} aria-label="Uncoil home"><BrandLogo /></Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Cloud directory / {step}</span>
      </header>
      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <aside className="relative isolate flex min-h-[420px] flex-col justify-between overflow-hidden border-b border-white/15 p-6 sm:p-8 md:p-12 lg:border-b-0 lg:border-r">
          <Image src={image} alt="" fill priority unoptimized sizes="60vw" className="-z-10 object-cover opacity-70 [image-rendering:pixelated]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,#090909_0%,rgba(9,9,9,0.65)_45%,rgba(9,9,9,0.1)_100%)]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">{eyebrow}</p>
          <div className="mt-24">
            <h1 className="max-w-3xl font-pixel text-[clamp(3.2rem,7vw,6.5rem)] leading-[0.88] tracking-[-0.07em]">{title}</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/70">{body}</p>
            {footer && <div className="mt-8 border-t border-white/20 pt-5">{footer}</div>}
          </div>
        </aside>
        <section className="flex items-center px-5 py-12 sm:px-8 md:px-12 lg:px-16">
          <div className="w-full max-w-xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
