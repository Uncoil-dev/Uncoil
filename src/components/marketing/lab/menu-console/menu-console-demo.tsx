"use client";

import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { UncoilMark } from "@/components/brand/uncoil-mark";
import { NightStrip } from "./art";
import { ConsoleMenu } from "./console-menu";

/** A phone-sized stand-in for the new homepage with the console menu open on load. */
export function MenuConsoleDemo() {
  const [open, setOpen] = useState(true);
  const button = useRef<HTMLButtonElement>(null);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#090909] text-[#eceae3]">
      <header className="flex h-14 items-center justify-between border-b border-white/15 pl-4">
        <span className="flex items-center gap-2.5">
          <UncoilMark className="text-[26px]" />
          <span className="font-pixel text-[26px] leading-none tracking-[-0.05em]">uncoil</span>
        </span>
        <button ref={button} type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex size-14 items-center justify-center border-l border-white/15">
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>
      <main className="px-5 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Concept · phone menu as a console</p>
        <h1 className="mt-4 font-pixel text-[56px] leading-[0.9] tracking-[-0.06em]">See the step that broke.</h1>
        <p className="mt-5 max-w-md text-[15px] leading-6 text-white/65">Tap the menu button to boot the console. Tap a section to list its pages, or type to jump straight to one.</p>
      </main>
      <div className="relative mt-10 h-[220px] overflow-hidden">
        <NightStrip className="absolute inset-0 h-full w-full" />
      </div>
      <ConsoleMenu
        open={open}
        onClose={() => {
          setOpen(false);
          button.current?.focus();
        }}
      />
    </div>
  );
}
