import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { plans } from "@/lib/pricing-plans";
import { LEGS, ROBOT_TOP } from "../pixel-world/pixels";
import { Eyebrow } from "./eyebrow";
import { AFTER_EYEBROW, H2, LABEL, SECTION, WRAP } from "./ui";
import { useCell } from "./use-grid";

const plan = (id: string) => plans.find((p) => p.id === id)!;
const [free, pro, team] = [plan("free"), plan("pro"), plan("team")];

// Each answer is grounded in the repo: the SDK READMEs for setup, the /security page for where
// data lives, and src/lib/pricing-plans.ts for retention and seats.
const FAQS: readonly (readonly [string, string])[] = [
  ["What is a span?", "One recorded step in a run: a model call, a tool call, a retrieval. Plans are sized by spans per month."],
  ["Do I have to rewrite my agent?", "No. Call init() once at startup and every OpenAI and Anthropic call is traced, with no client wrapping; in Python that covers LangChain and LangGraph too. In TypeScript, LangChain takes one callback handler and the Vercel AI SDK one middleware."],
  ["Where is my data kept?", "Traces are stored in a database we run ourselves in Frankfurt, Germany. Queued span events pass through a service in the United States, so there is no claim of end-to-end EU residency. Email, phone, card, SSN and API-key patterns are removed before they leave the EU region. The security page lists every place."],
  ["How long are traces kept?", `${free.retention} on ${free.name}, ${pro.retention} on ${pro.name} and ${team.retention} on ${team.name}. Enterprise sets its own retention.`],
  ["Can my team look at the same runs?", `Yes. ${pro.name} has room for ${pro.members} members and ${team.name} for ${team.members}, all looking at the same projects and traces.`],
];

/** A pixel plus that turns into a minus when its question is open. */
function Toggle() {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" className="size-[21px] shrink-0 md:size-[28px]" aria-hidden="true">
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
  const cell = useCell();
  const body = [...ROBOT_TOP, ...LEGS[0]];
  return (
    <svg viewBox="-1 -9 14 23" width={14 * cell} height={23 * cell} shapeRendering="crispEdges" aria-hidden="true">
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
    <section id="faq" className={`scroll-mt-16 bg-[#eceae3] text-[#090909] ${SECTION}`} aria-labelledby="mix-faq-title">
      <div className={WRAP}>
        <Eyebrow n="08" on="cream">Questions</Eyebrow>
        <div className={`${AFTER_EYEBROW} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
          {/* Heading at the top, the robot standing on the line the last answer ends on. */}
          <div className="flex flex-col">
            <h2 id="mix-faq-title" className={H2}>Quick answers.</h2>
            <Link href="/docs" className={`mt-6 inline-flex min-h-11 w-fit items-center gap-2 underline underline-offset-4 hover:text-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909] ${LABEL}`}>
              More in the docs <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <div className="mt-auto hidden pt-12 lg:block">
              <AskingRobot />
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
