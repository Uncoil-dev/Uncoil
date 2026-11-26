import { HeroSession } from "./hero-session";
import { Turn } from "./turn";
import { RecordOutput } from "./record-output";
import { CostOutput } from "./cost-output";
import { Receipts } from "./receipts";
import { FinalOutput } from "./final-output";

/** The homepage told as one coding-agent session: each section is the next question and its answer. */
export function TerminalPage() {
  return (
    <div className="overflow-x-clip bg-[#eceae3] pb-24 md:pb-32">
      <HeroSession />
      <Turn n={2} id="turn-record" prompt="what does uncoil actually record?">
        <RecordOutput />
      </Turn>
      <Turn n={3} id="turn-cost" prompt="how much did the broken run burn?">
        <CostOutput />
      </Turn>
      <Turn n={4} id="turn-pricing" prompt="and what does uncoil cost me?">
        <Receipts />
      </Turn>
      <Turn n={5} id="turn-setup" prompt="ok. set it up.">
        <FinalOutput />
      </Turn>
    </div>
  );
}
