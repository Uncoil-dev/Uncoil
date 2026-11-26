import Link from "next/link";
import { plans } from "@/lib/pricing-plans";
import { LABEL } from "./ui";

const free = plans.find((p) => p.id === "free")!;

// Only what the repository states: the plan data in src/lib/pricing-plans.ts and the storage and
// redaction facts on the /security page.
const FACTS = [
  ["Free plan", `No card. ${free.spans} spans a month, kept ${free.retention}.`],
  ["Where traces live", "In our own database on a server in Frankfurt, Germany."],
  ["Redaction", "Email, phone, card and API-key patterns are removed before queued events leave the EU region."],
  ["Plugs in", "TypeScript and Python SDKs, OpenTelemetry or plain HTTP."],
] as const;

/** What is true and reassuring, straight after the hero: the stack it fits, the free plan, where data goes. */
export function TrustFacts() {
  return (
    <div className="bg-[#090909] px-5 pb-6 pt-10 text-[#eceae3] md:px-10 md:pt-12">
      <dl className="mx-auto grid max-w-[1320px] border-t border-[#eceae3] sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map(([k, v], i) => (
          <div key={k} className={`border-b border-[#eceae3]/25 py-5 sm:pr-6 lg:border-b-0 ${i ? "lg:border-l lg:pl-6" : ""} ${i % 2 ? "sm:border-l sm:pl-6 lg:pl-6" : ""}`}>
            <dt className={`flex items-center gap-2 text-[#eceae3]/60 ${LABEL}`}>
              <span aria-hidden="true" className="size-1.5 bg-[#f4d44d]" />
              {k}
            </dt>
            <dd className="mt-2 text-[15px] leading-6 text-[#eceae3]/85">{v}</dd>
          </div>
        ))}
      </dl>
      <p className={`mx-auto mt-4 flex max-w-[1320px] justify-end ${LABEL}`}>
        <Link href="/security" className="inline-flex min-h-11 items-center gap-2 text-[#eceae3]/70 underline underline-offset-4 hover:text-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eceae3]">
          Every place your data goes <span aria-hidden="true">→</span>
        </Link>
      </p>
    </div>
  );
}
