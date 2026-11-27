import Link from "next/link";
import { LABEL } from "./ui";

// The address the /contact page offers for general questions.
const MAIL = "hello@uncoil.dev";

/** A short note from the person who builds Uncoil: the quietest moment on the page, on purpose. */
export function FounderNote() {
  return (
    <section id="note" className="bg-[#eceae3] px-5 pb-6 pt-2 text-[#090909] md:px-10 md:pb-8" aria-labelledby="mix-note-title">
      <div className="mx-auto max-w-[50rem] border-t-2 border-[#090909] pt-8">
        <h2 id="mix-note-title" className={`text-black/60 ${LABEL}`}>A note from the builder</h2>
        <div className="mt-5 space-y-3 text-lg leading-8">
          <p>I build Uncoil on my own.</p>
          <p>I started it because agents fail quietly. The run ends, the log looks fine, and the step that actually went wrong sits a few lines up with nothing marking it. I wanted to see that step.</p>
          <p>If something breaks, confuses you or is missing, tell me. You will be writing to the person who builds it.</p>
        </div>
        <p className="mt-5 font-pixel text-4xl tracking-[-0.06em]">Kristoffer</p>
        <p className={`mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 ${LABEL}`}>
          <a href={`mailto:${MAIL}`} className="inline-flex min-h-11 items-center border-b border-[#090909] hover:bg-[#f4d44d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">
            {MAIL}
          </a>
          <Link href="/contact" className="inline-flex min-h-11 items-center text-black/60 underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090909]">
            Other ways to reach us
          </Link>
        </p>
      </div>
    </section>
  );
}
