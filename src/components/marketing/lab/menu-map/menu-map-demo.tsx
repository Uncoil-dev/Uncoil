"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { MenuMap } from "./menu-map";

/**
 * A phone-sized stand-in page for reviewing the menu. On a phone it fills the screen; on a wider
 * screen it sits in a 390 x 844 frame. The frame's transform keeps the fixed menu inside it, and
 * the whole thing covers the site's own navbar so only the concept is on screen.
 */
export function MenuMapDemo({ path }: { path: string }) {
  const [open, setOpen] = useState(true);
  const button = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => button.current?.focus());
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#090909] text-[#eceae3]">
      <style>{FRAME}</style>
      <div className="mm-frame relative overflow-hidden bg-[#090909] [transform:translateZ(0)]">
        <div className="h-full overflow-y-auto">
          <div className="flex h-14 items-center justify-between border-b border-white/15 pl-4 pr-1.5">
            <Image src="/logos/uncoil/uncoil-logo-crisp-on-dark.svg" alt="Uncoil" width={150} height={28} unoptimized className="h-7 w-[150px]" />
            <button ref={button} type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex size-12 items-center justify-center border border-white/25">
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="px-5 py-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Concept · phone menu · world map</p>
            <p className="mt-5 font-pixel text-6xl leading-[0.85] tracking-[-0.07em]">See the step that broke.</p>
            <p className="mt-5 max-w-[34ch] text-white/65">Open the menu with the button at the top right.</p>
          </div>
        </div>
        {open && <MenuMap path={path} onClose={close} />}
      </div>
    </div>
  );
}

const FRAME = `
.mm-frame{width:100%;height:100%}
@media (min-width:600px) and (min-height:700px){.mm-frame{width:390px;height:min(844px,100dvh - 32px);outline:2px solid rgba(236,234,227,0.25)}}
`;
