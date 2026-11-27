"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { getRegionForHostname, getUncoilRegion, type UncoilRegionId } from "@/lib/regions";
import { AuthWorld, type AuthMode } from "./auth-world";
import { STOP_FRACTIONS } from "./scene";
import styles from "./lab-auth.module.css";

const STOPS = [
  { title: "Paste one prompt", note: "Claude Code, Cursor or Codex sets Uncoil up for you." },
  { title: "First trace lands", note: "Run your agent once. Every call and its cost lands as one run." },
  { title: "See the step that broke", note: "Jump to the failed step, with its input and its error." },
] as const;

const COPY = {
  "sign-up": {
    eyebrow: "New account · free plan · no card",
    title: "Three stops to your first trace.",
    body: "Make an account, then follow the path. Most of the walking is done by your coding agent.",
  },
  "sign-in": {
    eyebrow: "Workspace · signed out",
    title: "Back across the bridge.",
    body: "Sign in to open your latest runs, find the step that broke and see what it cost.",
  },
} as const;

const WAITING = ["Latest runs", "Failed steps", "Cost per run"] as const;

// Keeps a fixed band under the ground line for the stop notes, so the art never runs through them.
const RESERVE = { "sign-up": 200, "sign-in": 112 } as const;

const noSubscribe = () => () => {};

/** The region the page was served from; the host is only known in the browser. */
function useRegionId(): UncoilRegionId {
  return useSyncExternalStore(
    noSubscribe,
    () => getRegionForHostname(window.location.host) ?? getUncoilRegion().id,
    () => getUncoilRegion().id,
  );
}

export function LabAuthShell({ mode, children }: { mode: AuthMode; children: ReactNode }) {
  const copy = COPY[mode];
  const region = getUncoilRegion(useRegionId());
  const textRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  return (
    <main className="min-h-svh bg-[#eceae3] text-[#090909] selection:bg-[#090909] selection:text-[#f4d44d] lg:grid lg:grid-cols-[minmax(440px,36%)_1fr]">
      {/* Phones and tablets: the path shrinks to a short band above the form. */}
      <div className="bg-[#090909] lg:hidden">
        <div className="flex h-16 items-center px-5 sm:px-8">
          <Link href="/" aria-label="Uncoil home" className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]">
            <BrandLogo />
          </Link>
        </div>
        <div className="relative isolate h-28 overflow-hidden sm:h-32">
          <AuthWorld mode={mode} band />
        </div>
      </div>

      <section className="flex min-h-[calc(100svh-11rem)] flex-col px-5 pb-6 pt-8 sm:px-8 lg:min-h-svh lg:px-12 lg:py-8 xl:px-16">
        <div className="mx-auto hidden w-full max-w-[440px] lg:block">
          <Link href="/" aria-label="Uncoil home" className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#090909]">
            <BrandLogo tone="light" />
          </Link>
        </div>
        <h1 className="sr-only lg:hidden">{copy.title}</h1>

        <div className="flex flex-1 items-center py-2 lg:py-8">
          <div className={`${styles.form} mx-auto w-full max-w-[440px]`}>{children}</div>
        </div>

        {mode === "sign-up" ? (
          <div className="mx-auto mt-8 w-full max-w-[440px] border-t-2 border-[#090909] pt-5 lg:hidden">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#090909]/70">What happens next</p>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {STOPS.map((stop, i) => (
                <li key={stop.title} className="flex gap-3 sm:block">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center bg-[#090909] font-mono text-xs text-[#f4d44d]">0{i + 1}</span>
                  <span className="block sm:mt-3">
                    <span className="block font-mono text-xs uppercase tracking-[0.1em]">{stop.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#090909]/70">{stop.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mx-auto mt-8 flex w-full max-w-[440px] flex-wrap items-center justify-between gap-x-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#090909]/70">
          <Link href={`/cloud?next=/${mode}`} className="inline-flex min-h-11 items-center hover:text-[#090909] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">
            {region.flag} {region.shortName} region · Change
          </Link>
          <Link href={process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.uncoil.dev"} className="inline-flex min-h-11 items-center gap-2 hover:text-[#090909] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">
            Back to site <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <aside className="relative isolate hidden overflow-hidden bg-[#090909] lg:sticky lg:top-0 lg:h-svh lg:self-start text-[#eceae3] lg:block" aria-label={mode === "sign-up" ? "What happens after you sign up" : "What is waiting for you"}>
        <AuthWorld mode={mode} reserve={RESERVE[mode]} clearRef={textRef} onActive={setActive} />
        <div ref={textRef} className="relative w-fit max-w-[min(46rem,100%)] px-10 pt-14 xl:px-14 xl:pt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#eceae3]/65">{copy.eyebrow}</p>
          <h1 className="mt-5 max-w-[14ch] text-balance font-pixel text-[clamp(2.6rem,4.4vw,5rem)] leading-[0.9] tracking-[-0.07em]">{copy.title}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#eceae3]/80">{copy.body}</p>
        </div>

        <div className={`absolute inset-x-0 bottom-0 pb-8 ${mode === "sign-in" ? "px-10 xl:px-14" : ""}`} style={{ height: RESERVE[mode] - 24 }}>
          {mode === "sign-up" ? (
            <ol className="relative h-full">
              {STOPS.map((stop, i) => {
                const lit = active === null || active === i;
                return (
                  <li key={stop.title} data-active={active === i || undefined} className="absolute top-0 w-[25%] -translate-x-1/2 text-center transition-opacity duration-300 motion-reduce:transition-none" style={{ left: `${STOP_FRACTIONS[i] * 100}%`, opacity: lit ? 1 : 0.55 }}>
                    <p className={`font-pixel text-3xl leading-none tracking-[-0.06em] ${active === i ? "text-[#f4d44d]" : ""}`}>0{i + 1}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em]">{stop.title}</p>
                    <p className="mx-auto mt-2 max-w-[24ch] text-[13px] leading-5 text-[#eceae3]/75">{stop.note}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex h-full items-center justify-between gap-6 border-t border-[#eceae3]/15 pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eceae3]/70">
              <span>Waiting for you</span>
              <ul className="flex flex-wrap justify-end gap-x-8 gap-y-2">
                {WAITING.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="size-2 bg-[#f4d44d]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
