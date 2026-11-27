"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { ManualCopy, useCopy } from "./copy-prompt";
import { Eyebrow } from "./eyebrow";
import { promptLines } from "./story";
import { AGENTS, BY_HAND, promptFor, type Agent } from "./prompt";
import { AFTER_EYEBROW, BODY, H2, LABEL, SECTION_FLUSH, WRAP } from "./ui";
import { MorningGround } from "./morning-ground";

function ByHand() {
  const [lang, setLang] = useState<(typeof BY_HAND)[number]["id"]>("ts");
  const { done, manual, copy, closeManual } = useCopy();
  const m = BY_HAND.find((b) => b.id === lang)!;
  const block = (id: "shell" | "code", text: string, body: ReactNode, label: string) => (
    <div className="relative border-b border-[#eceae3]/15 last:border-b-0">
      <pre className="overflow-x-auto p-4 pr-14 font-mono text-[12px] leading-6"><code>{body}</code></pre>
      <button type="button" onClick={() => copy(id, text)} aria-label={label} className="absolute right-0 top-0 grid size-12 place-items-center hover:bg-[#f4d44d] hover:text-black focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d]">
        {done === id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </button>
      {manual === id && <ManualCopy text={text} onClose={closeManual} className="right-0 top-12" />}
    </div>
  );
  return (
    <div className="min-w-0 lg:col-span-2">
      <div className={`flex flex-wrap items-center border-b border-[#eceae3]/15 ${LABEL}`}>
        {BY_HAND.map((b) => (
          <button key={b.id} type="button" aria-pressed={lang === b.id} onClick={() => setLang(b.id)} className={`min-h-11 px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#f4d44d] ${lang === b.id ? "bg-[#eceae3] text-black" : "text-[#eceae3]/55 hover:text-[#eceae3]"}`}>
            {b.label}
          </button>
        ))}
        <span className="px-4 py-3 text-[#eceae3]/45">{m.note}</span>
      </div>
      {block("shell", m.shell, m.shell.split("\n").map((l) => <span key={l} className="block"><span className="select-none text-[#f4d44d]/70">$ </span>{l}</span>), "Copy install commands")}
      {block("code", m.code, m.code, "Copy code")}
      <span className="sr-only" role="status">{done ? "Copied" : ""}</span>
    </div>
  );
}

const TABS = [...AGENTS, "By hand"] as const;
type Tab = (typeof TABS)[number];

export function Setup() {
  const [tab, setTab] = useState<Tab>("Claude Code");
  const agent: Agent = tab === "By hand" ? "Claude Code" : tab;
  const { done, manual, copy, closeManual } = useCopy();
  const prompt = promptFor(agent);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + TABS.length) % TABS.length;
    setTab(TABS[n]);
    tabRefs.current[n]?.focus();
  };

  return (
    <section id="pw-setup" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION_FLUSH}`} aria-labelledby="mix-setup-title">
      <div className={WRAP}>
        <Eyebrow n="05" on="cream">Setup</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14`}>
          <div>
            <h2 id="mix-setup-title" className={H2}>One prompt sets it up.</h2>
            <p className={`mt-6 max-w-md text-black/75 ${BODY}`}>Paste it into your coding agent. It installs Uncoil, signs you in in the browser and sends a first trace. About five minutes, start to finish.</p>
          </div>

        <div className="min-w-0">
          <div className="border-2 border-black bg-[#090909] text-[#eceae3]">
            <div role="tablist" aria-label="How to set it up" className="grid grid-cols-2 border-b-2 border-black font-mono text-[10px] uppercase tracking-[0.12em] sm:grid-cols-4 sm:text-[11px]">
              {TABS.map((a, i) => (
                <button
                  key={a}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`setup-tab-${i}`}
                  aria-selected={tab === a}
                  aria-controls="setup-panel"
                  tabIndex={tab === a ? 0 : -1}
                  onClick={() => setTab(a)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`relative min-h-12 px-2 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#f4d44d] ${tab === a ? "bg-[#eceae3] text-black" : "text-[#eceae3]/60 hover:bg-[#eceae3]/10 hover:text-[#eceae3]"}`}
                >
                  {a}
                  {tab === a && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#f4d44d]" />}
                </button>
              ))}
            </div>
            <div id="setup-panel" role="tabpanel" aria-labelledby={`setup-tab-${TABS.indexOf(tab)}`} className="grid">
              {tab === "By hand" ? (
                <ByHand />
              ) : (
                <>
                  <div className="relative flex min-w-0 flex-col">
                    <div className="p-5 font-mono text-[12px] leading-6 text-[#eceae3]/85 md:p-6">
                      {promptLines(prompt).map(({ num, text }, i) =>
                        num ? (
                          <p key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)]">
                            <span className="text-[#f4d44d]">{num}.</span>
                            <span>{text}</span>
                          </p>
                        ) : text ? (
                          <p key={i}>{text}</p>
                        ) : (
                          <span key={i} className="block h-3" aria-hidden="true" />
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => copy("prompt", prompt)}
                      className="group mt-auto flex w-full items-center justify-between gap-4 bg-[#f4d44d] px-5 py-5 text-left font-mono text-black transition-colors hover:bg-[#fff4b5] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#090909] md:px-6"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] uppercase tracking-[0.14em] md:text-[15px]">{done === "prompt" ? `Copied. Paste it in ${agent}` : "Copy setup prompt"}</span>
                        <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-black/60">Sign in when the browser opens. No account? Make one there.</span>
                      </span>
                      <span className="grid size-12 shrink-0 place-items-center bg-black text-[#f4d44d]">
                        {done === "prompt" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                      </span>
                    </button>
                    {manual === "prompt" && <ManualCopy text={prompt} onClose={closeManual} className="bottom-full left-0 mb-2" />}
                    <span className="sr-only" role="status">{done === "prompt" ? "Prompt copied" : ""}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      {/* A thin landscape between setup and price: the ridge and pines with a low yellow sun behind it. */}
      <MorningGround rows={16} glow={0.45} hills={0.8} pines sun className="-mx-5 mt-3 md:-mx-10" />
    </section>
  );
}
