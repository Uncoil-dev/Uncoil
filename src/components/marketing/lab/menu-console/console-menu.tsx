"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, CornerDownLeft, X } from "lucide-react";
import { UncoilMark } from "@/components/brand/uncoil-mark";
import { appHref } from "@/lib/app-links";
import { NightStrip, RobotAvatar } from "./art";
import { findPages, type Match } from "./match";
import { ALL, GROUPS, PRICING, SETUP_PROMPT, SIGN_IN, START, type Entry } from "./menu-data";
import s from "./console.module.css";

const hrefOf = (e: Entry) => (e.app ? appHref(e.href) : e.href);
const HINTS = ["pricing", "py", "docs", "changelog", "status", "sign in"];
const PS1 = "~/uncoil.dev";
const LINKS = GROUPS.reduce((n, g) => n + g.entries.length, 1);
const at = (ms: number, n?: number) => ({ "--d": `${ms}ms`, ...(n ? { "--n": n } : {}) }) as CSSProperties;

function Prompt({ cmd, delay = 0, live = false }: { cmd: string; delay?: number; live?: boolean }) {
  return (
    <p className={`font-mono text-[12px] leading-6 text-white/45 ${s.line}`} style={at(delay)}>
      {PS1} <span className="text-[#f4d44d]">$</span>{" "}
      {live ? <span className="text-[#eceae3]">{cmd}</span> : <span className={`text-[#eceae3] ${s.type}`} style={at(delay, cmd.length)}>{cmd}</span>}
    </p>
  );
}

function Marked({ text, marks }: { text: string; marks: Match["marks"] }) {
  const out: ReactNode[] = [];
  let i = 0;
  for (const [a, b] of marks) {
    if (a > i) out.push(text.slice(i, a));
    out.push(<span key={a} className="underline decoration-2 underline-offset-4">{text.slice(a, b)}</span>);
    i = b;
  }
  out.push(text.slice(i));
  return <>{out}</>;
}

function useVisualViewport() {
  const [vp, setVp] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const sync = () => setVp({ h: v.height, top: v.offsetTop });
    sync();
    v.addEventListener("resize", sync);
    v.addEventListener("scroll", sync);
    return () => {
      v.removeEventListener("resize", sync);
      v.removeEventListener("scroll", sync);
    };
  }, []);
  return vp;
}

/** Mounted fresh on every open, so the boot plays again and old output is gone. */
export function ConsoleMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <Console onClose={onClose} /> : null;
}

function Console({ onClose }: { onClose: () => void }) {
  const [ran, setRan] = useState<{ name: string; n: number } | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [copy, setCopy] = useState<{ ok: boolean; n: number } | null>(null);
  const [skip, setSkip] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLDivElement>(null);
  const hits = useRef<(HTMLAnchorElement | null)[]>([]);
  const vp = useVisualViewport();
  const results = useMemo(() => findPages(ALL, q), [q]);
  const short = (vp?.h ?? 900) < 540;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      [html.style.overflow, document.body.style.overflow] = prev;
      back?.focus();
    };
  }, []);

  // Keep the newest output in view: a run scrolls its group to the top, a copy to the bottom.
  useEffect(() => {
    const el = out.current;
    if (!el) return;
    if (q) el.scrollTop = el.scrollHeight;
    else if (ran) el.scrollTop = el.querySelector<HTMLElement>(`[data-group="${ran.name}"]`)?.offsetTop ?? 0;
  }, [q, ran]);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);
  useEffect(() => {
    if (copy && out.current) out.current.scrollTop = out.current.scrollHeight;
  }, [copy]);

  const run = (name: string) => setRan((r) => (r?.name === name ? null : { name, n: (r?.n ?? 0) + 1 }));

  async function copyPrompt() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
    } catch {
      ok = false;
    }
    setCopy((c) => ({ ok, n: (c?.n ?? 0) + 1 }));
    setFlash(ok);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 2000);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    setSkip(true);
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab" || !panel.current) return;
    const f = [...panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,textarea")].filter((el) => el.offsetParent !== null);
    const first = f[0];
    const last = f[f.length - 1];
    const wrapTo = e.shiftKey ? (document.activeElement === first || document.activeElement === panel.current ? last : null) : document.activeElement === last ? first : null;
    if (!wrapTo) return;
    e.preventDefault();
    wrapTo.focus();
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      setSel((i) => (results.length ? (i + d + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[sel]) {
      e.preventDefault();
      hits.current[sel]?.click();
    }
  }

  const row = "flex w-full items-center gap-3 border-b border-dashed border-white/10 text-left";

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      onKeyDown={onKey}
      onPointerDown={() => setSkip(true)}
      className={`fixed inset-x-0 z-[100] flex flex-col bg-[#090909] text-[#eceae3] outline-none ${s.scan} ${skip ? s.skip : ""}`}
      style={{ top: vp?.top ?? 0, height: vp ? vp.h : "100dvh" }}
    >
      <header className="flex h-14 shrink-0 items-center border-b border-white/15 pl-4">
        <UncoilMark className="text-[26px]" />
        <span className="ml-2.5 font-mono text-[12px] text-[#eceae3]">uncoil.dev</span>
        <span className="ml-2 border border-white/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">menu</span>
        <Link href={SIGN_IN.href} onClick={onClose} className="ml-auto flex h-14 items-center px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/75 hover:text-white">
          Sign in
        </Link>
        <button type="button" onClick={onClose} aria-label="Close menu" className="flex size-14 items-center justify-center bg-[#f4d44d] text-[#090909]">
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div ref={out} className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain ${s.noBar}`}>
        <div className={q ? "pointer-events-none select-none opacity-30" : "contents"} inert={!!q} aria-hidden={q ? true : undefined}>
          <div className="flex min-h-full flex-col pb-4">
            <div className={`relative h-[clamp(112px,34vw,140px)] shrink-0 grow overflow-hidden border-b border-white/10 [max-height:300px] ${short ? "hidden" : ""}`}>
              <NightStrip className="absolute inset-0 h-full w-full" />
              <p className={`absolute left-4 top-3 font-pixel text-[clamp(30px,10vw,42px)] leading-none tracking-[-0.05em] ${s.line}`}>
                Where to<span className={`text-[#f4d44d] ${s.cursor}`}>_</span>
              </p>
            </div>
            <div className="px-4 pt-3">
              <p hidden={short} className={`font-mono text-[11px] leading-5 text-white/40 ${s.line}`} style={at(40)}>
                <span className="text-[#f4d44d]">[ ok ]</span> {GROUPS.length + 1} sections · {LINKS} pages indexed
              </p>
              <p hidden={short} className={`font-mono text-[11px] leading-5 text-white/40 ${s.line}`} style={at(90)}>
                <span className="text-[#f4d44d]">[ ok ]</span> tap a section, or type below to jump
              </p>
              <div className={short ? "" : "mt-2"}>
                <Prompt cmd="ls" delay={140} />
              </div>
            </div>
            <ul className="mt-1 border-t border-dashed border-white/10">
              {GROUPS.map((g, i) => {
                const isOpen = ran?.name === g.name;
                const slug = g.name.toLowerCase();
                return (
                  <li key={g.name} data-group={g.name} className={`${s.line} scroll-mt-0`} style={at(180 + i * 45)}>
                    <button type="button" aria-expanded={isOpen} onClick={() => run(g.name)} className={`${row} relative min-h-[58px] px-4 ${isOpen ? "bg-white/[0.04]" : ""}`}>
                      {isOpen && <span className="absolute inset-y-0 left-0 w-1 bg-[#f4d44d]" aria-hidden="true" />}
                      <span className="w-5 font-mono text-[11px] text-[#f4d44d]">0{i + 1}</span>
                      <span className="flex-1 font-pixel text-[30px] leading-none tracking-[-0.05em]">
                        {g.name}
                        <span className="text-white/30">/</span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{isOpen ? "open" : `${g.entries.length} pages`}</span>
                      <span className={`font-mono text-[14px] text-[#f4d44d] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true">›</span>
                    </button>
                    {isOpen && (
                      <div key={ran.n} className="border-b border-dashed border-white/10 bg-white/[0.02] pb-2 pl-4 pr-3 pt-2">
                        <Prompt cmd={`ls ${slug}/`} />
                        <ul className="ml-1 border-l border-white/20">
                          {g.entries.map((e, j) => (
                            <li key={e.href + e.title} className={s.slide} style={at(110 + j * 32)}>
                              <Link href={hrefOf(e)} onClick={onClose} className="group flex min-h-[54px] items-center gap-3 py-1.5 pr-1">
                                <span className="h-px w-3 shrink-0 bg-white/30 group-hover:bg-[#f4d44d]" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-baseline gap-2">
                                    <span className="font-mono text-[15px] leading-6 group-hover:text-[#fff4b5]">{e.title}</span>
                                    <span className="truncate font-mono text-[10px] text-white/25">{e.href}</span>
                                  </span>
                                  <span className="block text-[13px] leading-5 text-white/55">{e.desc}</span>
                                </span>
                                <ArrowUpRight className="size-4 shrink-0 text-[#f4d44d]" aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
              <li className={s.line} style={at(180 + GROUPS.length * 45)}>
                <Link href={PRICING.href} onClick={onClose} className={`${row} min-h-[58px] px-4`}>
                  <span className="w-5 font-mono text-[11px] text-[#f4d44d]">05</span>
                  <span className="flex-1 font-pixel text-[30px] leading-none tracking-[-0.05em]">Pricing</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">plans</span>
                  <ArrowRight className="size-4 text-[#f4d44d]" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
        {q && (
          <div className="border-t border-white/15 bg-[#090909] px-4 pb-3 pt-3">
            <Prompt cmd={`find ${q}`} live />
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
              {results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"} · enter opens the lit one` : `no page matches "${q}"`}
            </p>
            {results.length ? (
              <ul className="border-t border-dashed border-white/10">
                {results.map((m, i) => (
                  <li key={m.hit.href} className={s.slide} style={at(i * 22)}>
                    <Link
                      ref={(el) => {
                        hits.current[i] = el;
                      }}
                      href={hrefOf(m.hit)}
                      onClick={onClose}
                      onMouseEnter={() => setSel(i)}
                      className={`${row} min-h-[56px] px-3 py-2 ${i === sel ? "bg-[#f4d44d] text-[#090909]" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[15px] leading-6">
                          <Marked text={m.hit.title} marks={m.marks} />
                        </span>
                        <span className={`block truncate text-[13px] ${i === sel ? "text-[#090909]/70" : "text-white/50"}`}>{m.hit.desc}</span>
                      </span>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${i === sel ? "text-[#090909]/70" : "text-white/35"}`}>{m.hit.group}</span>
                      {i === sel ? <CornerDownLeft className="size-4 shrink-0" aria-hidden="true" /> : <ArrowUpRight className="size-4 shrink-0 text-white/30" aria-hidden="true" />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-white/60">Try a section name, or tap one of the suggestions below.</p>
            )}
          </div>
        )}

        {copy && (
          <div key={copy.n} className="px-4 pb-4" role="status">
            <Prompt cmd="cat setup-prompt.md | pbcopy" />
            {copy.ok ? (
              <p className={`font-mono text-[12px] leading-6 ${s.line}`} style={at(420)}>
                <span className="text-[#f4d44d]">✓ copied</span> <span className="text-white/55">· paste it into your coding agent</span>
              </p>
            ) : (
              <div className={s.line} style={at(420)}>
                <p className="font-mono text-[12px] leading-6 text-white/55">clipboard blocked · select the text and copy it</p>
                <textarea readOnly aria-label="Setup prompt" value={SETUP_PROMPT} onFocus={(e) => e.currentTarget.select()} rows={6} className="mt-1 w-full resize-none border border-white/20 bg-[#090909] p-2 font-mono text-[16px] leading-snug text-[#eceae3] outline-none focus:border-[#f4d44d]" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/15">
        <label className="flex h-14 items-center gap-2.5 pl-3 focus-within:bg-white/[0.04]">
          <RobotAvatar look={!!q} className="h-[30px] w-6 shrink-0" />
          <span className="shrink-0 font-mono text-[13px] text-white/45">
            ~ <span className="text-[#f4d44d]">$</span>
          </span>
          <span className="relative h-full min-w-0 flex-1">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={onInputKey}
              maxLength={24}
              aria-label="Find a page"
              aria-controls="console-results"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="absolute inset-0 w-full bg-transparent font-mono text-[16px] text-[#eceae3] caret-transparent outline-none"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center whitespace-pre font-mono text-[16px]" aria-hidden="true">
              <span className="invisible">{q}</span>
              <span className={`inline-block h-[1.15em] w-[0.6em] bg-[#f4d44d] ${s.cursor}`} />
              {!q && <span className="ml-2 truncate text-white/35">find a page</span>}
            </span>
          </span>
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear" className="flex size-14 shrink-0 items-center justify-center text-white/60">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <span id="console-results" className="sr-only" aria-live="polite">
          {q ? `${results.length} pages match` : ""}
        </span>

        {!short && (
          <div className={`flex h-12 items-center gap-1.5 overflow-x-auto border-t border-dashed border-white/10 px-3 ${s.noBar}`}>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">try</span>
            {HINTS.map((h) => (
              <button key={h} type="button" onClick={() => {
                  setQ(h);
                  setSel(0);
                }} className="flex h-12 min-w-12 shrink-0 items-center justify-center">
                <span className="border border-white/20 px-2.5 py-1.5 font-mono text-[12px] text-white/75 hover:border-[#f4d44d]">{h}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 border-t border-white/15 pb-[env(safe-area-inset-bottom)]">
          <Link href={hrefOf(START)} onClick={onClose} className="flex h-14 items-center justify-between bg-[#f4d44d] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#090909]">
            Start free <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={copyPrompt} className="flex h-14 items-center justify-between gap-2 px-4 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-[#eceae3] min-[360px]:text-[11px] min-[360px]:tracking-[0.1em]">
            {flash ? "Copied" : "Copy setup prompt"}
            {flash ? <Check className="size-4 shrink-0 text-[#f4d44d]" aria-hidden="true" /> : <Copy className="hidden size-4 shrink-0 min-[360px]:block" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
