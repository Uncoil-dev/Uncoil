"use client";

import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { ClosingWorld } from "./closing-world";
import { Cost } from "./cost";
import { Faq } from "./faq";
import { Fix } from "./fix";
import { HeroWorld } from "./hero";
import { Inventory } from "./inventory";
import { PixelEdge } from "./pixel-edge";
import { Price } from "./price";
import { Product } from "./product";
import { Rail } from "./rail";
import { Setup } from "./setup";
import { Tools } from "./tools";
import { TrustFacts } from "./trust";
import { Where } from "./where";

const INK = "#090909";
const CREAM = "#eceae3";

/**
 * Combined homepage concept, told as one example run: the agent breaks (hero, which the visitor
 * can break themselves), what it works with and where data goes, where it broke, the real trace
 * view, what it cost, the fix and the comparison, setup, what you get, the price, answers and
 * the way in. Night sections carry the pixel art, cream sections explain it, every colour change
 * is a pixel seam, and a rail tracks the chapters like steps in a trace.
 */
export function LabHomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-x-clip bg-[#eceae3]">
        <SmoothScroll />
        <Rail />
        <HeroWorld />
        <Tools />
        <TrustFacts />
        <PixelEdge from={INK} to={CREAM} seed={3} sparks />
        <Where />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={5} />
        <Product />
        <PixelEdge from={INK} to={CREAM} seed={8} />
        <Cost />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={11} />
        <Fix />
        <PixelEdge from={INK} to={CREAM} seed={13} />
        <Setup />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={15} />
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
