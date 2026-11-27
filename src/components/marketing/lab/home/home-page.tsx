"use client";

import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { ClosingWorld } from "./closing-world";
import { Faq } from "./faq";
import { Fix } from "./fix";
import { FounderNote } from "./founder";
import { HeroWorld } from "./hero";
import { Inventory } from "./inventory";
import { LogsVs } from "./logs-vs";
import { PixelEdge } from "./pixel-edge";
import { Price } from "./price";
import { Product } from "./product";
import { Rail } from "./rail";
import { Setup } from "./setup";
import { Tools } from "./tools";
import { Where } from "./where";

const INK = "#090909";
const CREAM = "#eceae3";

/**
 * Combined homepage concept, told as one example run. The hero breaks it, the world carries on
 * through the page: where it broke (read back from the failure as you scroll), the same run in
 * your logs and in Uncoil, the failure that looks like yours in the real trace view standing in
 * the landscape, the fix and the price drop proven in Compare, what you get, setup, the price,
 * answers, a note from the builder, and the way in. Every colour change is a pixel seam, and a
 * rail tracks the chapters like steps in a trace.
 */
export function LabHomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-x-clip bg-[#eceae3]">
        <SmoothScroll />
        <Rail />
        <HeroWorld />
        <Tools />
        <PixelEdge from={INK} to={CREAM} seed={3} sparks />
        <Where />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={5} />
        <LogsVs />
        <Product />
        <PixelEdge from={INK} to={CREAM} seed={8} />
        <Fix />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={11} />
        <Inventory />
        <PixelEdge from={INK} to={CREAM} seed={13} />
        <Setup />
        <PixelEdge from={CREAM} to={INK} shape="flat" seed={15} />
        <Price />
        <PixelEdge from={INK} to={CREAM} seed={17} />
        <Faq />
        <FounderNote />
        <PixelEdge from={CREAM} to={INK} seed={19} />
        <ClosingWorld />
      </div>
    </MotionConfig>
  );
}
