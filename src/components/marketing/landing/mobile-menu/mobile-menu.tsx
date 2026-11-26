"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { appHref } from "@/lib/app-links";
import { currentHref, groupOf, mobileMenu } from "../nav-links";
import { SETUP_PROMPT } from "../setup-prompt";
import { MenuScene } from "./menu-scene";

const FOCUSABLE = "a[href], button:not([disabled]), textarea";
// The panel wipes down in five hard steps, like a pixel display filling in.
const stepped = (t: number) => Math.ceil(t * 5) / 5;

function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** A pixel plus that turns into a minus when its group is open. */
function Toggle({ open }: { open: boolean }) {
  return (
    <span className={`relative flex size-10 shrink-0 items-center justify-center border-2 transition-colors ${open ? "border-[#f4d44d] bg-[#f4d44d]" : "border-white/30"}`} aria-hidden="true">
      <span className={`absolute h-1 w-4 ${open ? "bg-black" : "bg-[#eceae3]"}`} />
      <span className={`absolute h-4 w-1 bg-[#eceae3] transition-transform duration-150 motion-reduce:transition-none ${open ? "scale-y-0" : ""}`} />
    </span>
  );
}

function Here() {
  return <span aria-hidden="true" className="ml-3 bg-[#f4d44d] px-1.5 py-0.5 align-middle font-mono text-[9px] uppercase tracking-[0.14em] text-black">Here</span>;
}

/**
 * The phone menu: a full-screen night scene with five big rows, groups that open in place,
 * and the two actions that matter pinned to the bottom. Mounted only while open.
 */
export function MobileMenu({ id, signedIn, onClose, logo }: { id: string; signedIn: boolean; onClose: () => void; logo: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const pathname = usePathname();
  const here = currentHref(pathname);
  const [open, setOpen] = useState<string | null>(() => groupOf(here));
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const base = useId();

  useEffect(() => {
    closeRef.current?.focus();
    // Opened on a page inside a group: bring its marked link into view.
    dialogRef.current?.querySelector("nav li li [aria-current=page]")?.scrollIntoView({ block: "nearest" });
    return () => window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (manual) promptRef.current?.select();
  }, [manual]);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
      ok = true;
    } catch {
      ok = legacyCopy(SETUP_PROMPT);
    }
    if (!ok) {
      setManual(true);
      return;
    }
    setManual(false);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const row = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, delay: 0.04 + i * 0.03 } });

  return (
    <motion.div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[#090909] text-[#eceae3] lg:hidden"
      initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
      animate={{ clipPath: "inset(0 0 0% 0)" }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: stepped }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-5">
        {logo}
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close menu" className="flex size-12 items-center justify-center bg-[#f4d44d] text-black shadow-[3px_3px_0_0_#eceae3] active:translate-x-px active:translate-y-px active:shadow-none">
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Site" data-menu-scroll className="min-h-0 shrink overflow-y-auto overscroll-contain">
        <ul>
          {mobileMenu.map((entry, i) => {
            const num = <span aria-hidden="true" className="w-7 shrink-0 font-mono text-[11px] text-[#f4d44d]">0{i + 1}</span>;
            const label = "font-pixel text-[clamp(2rem,10vw,2.75rem)] leading-none tracking-[-0.06em]";
            if (entry.kind === "link") {
              const current = here === entry.href;
              return (
                <motion.li key={entry.label} {...row(i)} className="border-b border-white/15">
                  <Link href={entry.href} onClick={onClose} aria-current={current ? "page" : undefined} className={`flex min-h-16 items-center gap-2 px-5 active:bg-white/[0.06] ${current ? "shadow-[inset_4px_0_0_0_#f4d44d]" : ""}`}>
                    {num}
                    <span className={label}>{entry.label}</span>
                    {current && <Here />}
                    <ArrowRight className="ml-auto size-5 shrink-0 text-white/60" aria-hidden="true" />
                  </Link>
                </motion.li>
              );
            }
            const expanded = open === entry.label;
            const holdsHere = groupOf(here) === entry.label;
            const panelId = `${base}-${entry.label}`;
            return (
              <motion.li key={entry.label} {...row(i)} className="border-b border-white/15">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : entry.label)}
                  className={`flex min-h-16 w-full items-center gap-2 px-5 text-left active:bg-white/[0.06] ${holdsHere ? "shadow-[inset_4px_0_0_0_#f4d44d]" : ""}`}
                >
                  {num}
                  <span className={label}>{entry.label}</span>
                  <span className="ml-auto" />
                  <Toggle open={expanded} />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={panelId}
                      key="panel"
                      className="overflow-hidden"
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: reduce ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="pb-3">
                        {entry.sections.map((section) => (
                          <div key={section.title ?? entry.label}>
                            {section.title && <p className="px-5 pb-1 pl-14 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">{section.title}</p>}
                            <ul className="relative">
                              <span className="absolute bottom-6 left-[59px] top-6 w-px bg-white/15" aria-hidden="true" />
                              {section.links.map((link) => {
                                const current = here === link.href;
                                return (
                                  <li key={link.href + link.label}>
                                    <Link href={link.href} onClick={onClose} aria-current={current ? "page" : undefined} className="group flex min-h-12 items-center gap-3 py-1.5 pl-14 pr-5 active:bg-white/[0.06]">
                                      <span className={`relative size-2 shrink-0 ${current ? "bg-[#f4d44d]" : "bg-white/30"}`} aria-hidden="true" />
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[17px] leading-6">
                                          {link.label}
                                          {current && <Here />}
                                        </span>
                                        <span className="block text-[13px] leading-5 text-white/55">{link.note}</span>
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
        {!signedIn && (
          <Link href="/cloud?next=/sign-in" onClick={onClose} className="flex min-h-14 items-center justify-between px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/75 active:bg-white/[0.06]">
            Have an account? Sign in <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </nav>

      {/* The scene takes whatever height the links leave free (a thin strip at least on tall screens) and never sits behind text. */}
      <div className={`relative min-h-0 flex-1 overflow-hidden border-t border-white/15 [@media(min-height:700px)]:min-h-[72px] ${manual ? "hidden" : ""}`} aria-hidden="true">
        {!manual && <MenuScene still={reduce} />}
      </div>
      <div className="relative mt-auto shrink-0 border-t border-white/15">
        {manual ? (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${base}-prompt`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
                Copy blocked. Select the prompt below.
              </label>
              <button type="button" onClick={() => setManual(false)} aria-label="Hide prompt" className="flex size-12 shrink-0 items-center justify-center border border-white/30">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <textarea ref={promptRef} id={`${base}-prompt`} readOnly value={SETUP_PROMPT} className="mt-2 block h-[min(11rem,28dvh)] w-full resize-none border-2 border-[#eceae3] bg-black p-3 font-mono text-[12px] leading-5 text-[#eceae3] outline-none focus:border-[#f4d44d]" />
          </div>
        ) : null}
        <div className="grid gap-3 bg-[#090909] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 min-[560px]:grid-cols-2">
          <Link
            href={signedIn ? appHref("/dashboard") : appHref("/sign-up")}
            onClick={onClose}
            className="flex h-14 items-center justify-between bg-[#f4d44d] px-5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-black shadow-[4px_4px_0_0_#eceae3] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {signedIn ? "Dashboard" : "Start free"} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={copy}
            className={`flex h-14 items-center justify-between border-2 px-5 font-mono text-xs font-medium uppercase tracking-[0.14em] transition-colors ${copied ? "border-[#eceae3] bg-[#eceae3] text-black" : "border-[#eceae3] text-[#eceae3] active:bg-white/10"}`}
          >
            {copied ? "Prompt copied" : "Copy setup prompt"}
            {copied ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <Copy className="size-4 shrink-0" aria-hidden="true" />}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Setup prompt copied" : manual ? "Copy was blocked. The prompt is shown in a text box." : ""}
        </p>
      </div>
    </motion.div>
  );
}
