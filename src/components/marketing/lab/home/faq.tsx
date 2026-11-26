import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LEGS, ROBOT_TOP } from "../pixel-world/pixels";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, H2, LABEL, WRAP } from "./ui";

// The same questions and answers as the live homepage.
const FAQS = [
  ["What is a span?", "One recorded step in a run: a model call, a tool call, a retrieval. Plans are sized by spans per month."],
  ["Do I have to rewrite my agent?", "No. Wrap the entry point once and mark the steps you care about. Everything else keeps working the way it does today."],
  ["What can I send traces from?", "The TypeScript and Python SDKs, OpenTelemetry, or plain HTTP."],
  ["Can I try it without paying?", "Yes. The Free plan includes the trace viewer and cost visibility, no card needed."],
  ["How long are traces kept?", "7 days on Free, 30 days on Pro and 90 days on Team. Enterprise sets its own retention."],
  ["Can my team look at the same runs?", "Yes. Pro has room for 5 members and Team for 20, all looking at the same projects and traces."],
] as const;

/** A pixel plus that turns into a minus when its question is open. */
function Toggle() {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" className="size-5 shrink-0 md:size-6" aria-hidden="true">
      <rect y="3" width="7" height="1" fill="currentColor" />
      <rect x="3" width="1" height="7" fill="currentColor" className="group-open:hidden" />
    </svg>
  );
}

function cells(rows: readonly string[], ch: string, dy = 0) {
  let d = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === ch) d += `M${x} ${y + dy}h1v1h-1z`;
  });
  return d;
}

// The robot from the pixel world, inked for the cream page, with a question over its head.
const QUESTION = [".CCC.", "C...C", "...C.", "..C..", ".....", "..C.."];

function AskingRobot() {
  const body = [...ROBOT_TOP, ...LEGS[0]];
  return (
    <svg viewBox="-1 -9 14 23" shapeRendering="crispEdges" className="h-auto w-28 md:w-36" aria-hidden="true">
      <g transform="translate(8 -8)">
        <path d={cells(QUESTION, "C")} fill="#090909" />
      </g>
      <path d={cells(body, "C")} fill="#090909" />
      <path d={cells(body, "Y")} fill="#f4d44d" />
      <rect x="-1" y="13" width="14" height="1" fill="#090909" />
    </svg>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 bg-[#eceae3] px-5 pb-16 pt-12 text-[#090909] md:px-10 md:pb-20 md:pt-16" aria-labelledby="mix-faq-title">
      <div className={WRAP}>
        <Eyebrow n="08" on="cream">Questions</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
          {/* Heading at the top, the robot standing on the line the last answer ends on. */}
          <div className="flex flex-col">
            <h2 id="mix-faq-title" className={H2}>Quick answers.</h2>
            <Link href="/docs" className={`mt-6 inline-flex min-h-11 w-fit items-center gap-2 underline underline-offset-4 hover:text-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909] ${LABEL}`}>
              More in the docs <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <div className="mt-auto hidden items-end gap-6 pt-12 lg:flex">
              <AskingRobot />
              <div className="pb-3">
                <p className={`text-black/60 ${LABEL}`}>Not answered here?</p>
                <Link href="/contact" className={`mt-2 inline-flex min-h-11 items-center gap-2 underline underline-offset-4 hover:text-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909] ${LABEL}`}>
                  Ask a person <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-[#090909]">
            {FAQS.map(([q, a], i) => (
              <details key={q} className="group border-b border-black/25" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909] md:gap-6 md:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="w-7 shrink-0 font-mono text-[10px] text-black/50 group-open:text-black">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-pixel text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.05] tracking-[-0.05em]">
                    <span className="bg-[linear-gradient(#f4d44d,#f4d44d)] bg-[length:0%_45%] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-open:bg-[length:100%_45%] group-hover:bg-[length:100%_45%]">{q}</span>
                  </span>
                  <Toggle />
                </summary>
                <p className="max-w-2xl pb-6 pl-11 text-base leading-7 text-black/75 md:pl-[3.25rem]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
