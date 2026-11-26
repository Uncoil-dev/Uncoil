"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { TraceMenu } from "./trace-menu";

// The page behind the menu pretends to be the docs page, so the menu has a step to mark.
const PRETEND_PATH = "/docs";

/** A phone-sized page with a menu button. The menu starts open so the concept is visible at once. */
export function MenuTraceDemo() {
  const [open, setOpen] = useState(true);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  return (
    // On wide screens the page sits in a phone-sized frame; the transform makes the frame the
    // containing block for the fixed menu, so the menu stays inside it.
    <div className="min-h-screen bg-[#090909] min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:py-10">
      <div className="relative min-h-screen bg-[#090909] text-[#eceae3] min-[900px]:h-[844px] min-[900px]:min-h-0 min-[900px]:w-[390px] min-[900px]:translate-x-0 min-[900px]:overflow-hidden min-[900px]:border min-[900px]:border-[#eceae3]/20">
        <header className="flex h-16 items-center justify-between border-b border-[#eceae3]/15 px-4">
          <Image src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={204} height={38} unoptimized className="h-[30px] w-auto" />
          <button ref={opener} type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex size-12 items-center justify-center border border-[#eceae3]/30">
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="px-5 pt-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">Docs</p>
          <h1 className="mt-4 font-pixel text-5xl leading-[0.95] tracking-[-0.05em]">Send your first trace.</h1>
          <p className="mt-5 max-w-sm font-sans text-[15px] leading-7 text-[#eceae3]/70">
            Concept page for the phone menu. The page pretends to be {PRETEND_PATH}, so the menu marks that step as the one you are on. Open the menu with the button above.
          </p>
        </div>
        {open && <TraceMenu currentPath={PRETEND_PATH} onClose={close} />}
      </div>
    </div>
  );
}
