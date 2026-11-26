import { AgentSetup } from "@/components/marketing/landing/agent-setup";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { Anatomy } from "../editorial/anatomy";
import { Cost } from "../editorial/cost";
import { Fix } from "../editorial/fix";
import { Price } from "../editorial/price";
import { HeroWorld } from "../pixel-world/hero-world";
import { ClosingWorld } from "./closing-world";
import { ShortJourney } from "./journey";
import { PixelEdge } from "./pixel-edge";

const INK = "#090909";
const CREAM = "#eceae3";
const YELLOW = "#f4d44d";

/**
 * Combined homepage concept: the pixel-world night scene tells the failure, cream editorial
 * spreads explain it, and the page closes back in the pixel world with the step repaired.
 * Every colour change is a pixel seam rather than a hard cut.
 */
export function LabHomePage() {
  return (
    <div className="overflow-x-clip bg-[#eceae3]">
      <SmoothScroll />
      <HeroWorld />
      <PixelEdge from={INK} to={CREAM} seed={3} sparks />
      <div className="[&>section]:pt-12 md:[&>section]:pt-16">
        <Anatomy />
      </div>
      <PixelEdge from={CREAM} to={INK} shape="flat" seed={5} />
      <ShortJourney />
      <PixelEdge from={INK} to={CREAM} seed={8} />
      <Cost />
      <PixelEdge from={CREAM} to={INK} shape="flat" seed={11} />
      <Fix />
      <PixelEdge from={INK} to={YELLOW} shape="flat" seed={13} />
      <div id="pw-setup" className="scroll-mt-16">
        <AgentSetup />
      </div>
      <div className="[&>section]:pt-16 md:[&>section]:pt-24">
        <Price />
      </div>
      <PixelEdge from={CREAM} to={INK} seed={17} />
      <ClosingWorld />
    </div>
  );
}
