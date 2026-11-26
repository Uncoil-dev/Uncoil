"use client";

import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { ClosingWorld } from "./closing-world";
import { Cost } from "./cost";
import { Faq } from "./faq";
import { Fix } from "./fix";
import { HeroWorld } from "./hero";
import { Inventory } from "./inventory";
import { ShortJourney } from "./journey";
import { PixelEdge } from "./pixel-edge";
import { Price } from "./price";
import { Setup } from "./setup";
import { Tools } from "./tools";
import { Where } from "./where";
import { Why } from "./why";

const INK = "#090909";
const CREAM = "#eceae3";

/**
 * Combined homepage concept. The story runs top to bottom without repeating itself: the agent
 * breaks (hero), where it broke, why, what it cost, the fix, how setup works, what you get,
 * the price, quick answers, and the pixel world again with the step repaired. Night sections
 * carry the pixel art, cream sections explain it, and every colour change is a pixel seam.
 */
export function LabHomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-x-clip bg-[#eceae3]">
        <SmoothScroll />
        <HeroWorld />
        <PixelEdge from={INK} to={CREAM} seed={3} sparks />
        <Where />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={5} />
        <Why />
        <PixelEdge from={INK} to={CREAM} seed={8} />
        <Cost />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={11} />
        <Fix />
        <ShortJourney />
        <PixelEdge from={INK} to={CREAM} seed={13} />
        <Setup />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={15} />
        <Tools />
        <Inventory />
        <PixelEdge from={INK} to={CREAM} seed={17} />
        <Price />
        <Faq />
        <PixelEdge from={CREAM} to={INK} seed={19} />
        <ClosingWorld />
      </div>
    </MotionConfig>
  );
}
