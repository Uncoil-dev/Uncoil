"use client";

import { KIT, SPRITE, spritePaths, type KitItem } from "./kit";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, H2, SECTION, WRAP } from "./ui";
import { useCell } from "./use-grid";

/** The four things a buyer asks about first; the story above already shows loops and cost. */
const PICKS: readonly { id: string; line: string }[] = [
  { id: "steps", line: "Input, output, model, tokens, cost and latency for every model and tool call." },
  { id: "alerts", line: "On Pro, alerts on failed runs, spend and slow runs, by email or Slack." },
  { id: "secrets", line: "The SDKs strip common key, token, JWT and password patterns before anything is sent." },
  { id: "search", line: "Filter runs by status, cost, latency or tokens. Exclude with a minus." },
];

/** An item sprite on the page grid, inked for the morning page: one sprite pixel is one page cell. */
function Sprite({ item, cell }: { item: KitItem; cell: number }) {
  const { cream, yellow } = spritePaths(item.sprite);
  return (
    <svg viewBox={`0 0 ${SPRITE} ${SPRITE}`} width={SPRITE * cell} height={SPRITE * cell} shapeRendering="crispEdges" className="shrink-0" aria-hidden="true">
      <path d={cream} fill="#090909" />
      <path d={yellow} fill="#f4d44d" />
    </svg>
  );
}

/** What you get, cut to the four things that earn their place, each a sprite and one line. */
export function Inventory() {
  const cell = useCell();
  return (
    <section id="kit" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="mix-kit-title">
      <div className={WRAP}>
        <Eyebrow n="04" on="cream">What you get</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-14`}>
          <h2 id="mix-kit-title" className={`max-w-[14ch] ${H2}`}>Built for reading agent runs.</h2>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PICKS.map(({ id, line }) => {
              const item = KIT.find((k) => k.id === id)!;
              return (
                <li key={id} className="flex items-start gap-5">
                  <Sprite item={item} cell={cell} />
                  <div className="min-w-0">
                    <h3 className="font-pixel text-[clamp(1.4rem,2vw,1.85rem)] leading-none tracking-[-0.05em]">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-6 text-black/75">{line}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
