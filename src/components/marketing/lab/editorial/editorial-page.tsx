import { AgentSetup } from "@/components/marketing/landing/agent-setup";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { Anatomy } from "./anatomy";
import { Closing } from "./closing";
import { Cost } from "./cost";
import { Fix } from "./fix";
import { EditorialHero } from "./hero";
import { Price } from "./price";

/** Editorial homepage concept: one idea per spread, big type, one piece of pixel art per section. */
export function EditorialPage() {
  return (
    <div className="overflow-x-clip bg-[#eceae3]">
      <SmoothScroll />
      <EditorialHero />
      <Anatomy />
      <Cost />
      <Fix />
      <AgentSetup />
      <Price />
      <Closing />
    </div>
  );
}
