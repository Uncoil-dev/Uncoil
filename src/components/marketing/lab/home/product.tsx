"use client";

import dynamic from "next/dynamic";
import { appHref } from "@/lib/app-links";
import { Eyebrow, NextStep } from "./eyebrow";
import { AFTER_EYEBROW, AFTER_HEADLINE, BODY, H2, SECTION, WRAP } from "./ui";

// The real trace view ships in its own chunk, so it never holds up the hero. It is still
// rendered on the server, so the section never shows an empty frame while it loads.
const TraceWindow = dynamic(() => import("./product-view").then((m) => m.TraceWindow));

export function Product() {
  return (
    <section id="trace" className={`scroll-mt-16 bg-[#090909] text-[#eceae3] ${SECTION}`} aria-labelledby="mix-trace-title">
      <div className={WRAP}>
        <Eyebrow n="02" on="ink">The trace</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-end lg:gap-16`}>
          <h2 id="mix-trace-title" className={H2}>
            <span className="block">Open the run.</span>
            <span className="block">Every step is in it.</span>
          </h2>
          <p className={`max-w-xl text-[#eceae3]/80 ${BODY}`}>
            This is the trace view from the dashboard, showing the same run. Every model call and tool call keeps its input, output, tokens, cost and time. Step 04 is selected: the search came back empty.
          </p>
        </div>
        <div className={`${AFTER_HEADLINE} min-h-[70rem] md:min-h-[50rem] lg:min-h-[31rem]`}>
          <TraceWindow />
        </div>
        <NextStep href={appHref("/demo/project")} on="ink">
          Open the live demo · no sign-up
        </NextStep>
      </div>
    </section>
  );
}
