"use client";

import { MotionConfig } from "framer-motion";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { ClosingWorld } from "./closing-world";
import { Companion } from "./companion";
import { Dawn } from "./dawn";
import { Faq } from "./faq";
import { Fix } from "./fix";
import { FounderNote } from "./founder";
import { HeroWorld } from "./hero";
import { Inventory } from "./inventory";
import { Price } from "./price";
import { Product } from "./product";
import { Setup } from "./setup";
import { Tools } from "./tools";
import { Where } from "./where";

/**
 * The homepage, told as one example run that the visitor picks in the hero: an empty search, a
 * retry loop, a hung tool or the wrong tool. The page starts at night while the run is broken:
 * where it broke, the same run in your logs and in Uncoil's trace view. The sun comes up as the
 * cause is found, and the rest is morning: the fix proven in Compare, what you get, setup, the
 * price, answers, a note from the builder, and the closing scene in full daylight. The robot
 * walks down the page beside the reader the whole way.
 */
export function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="overflow-x-clip bg-[#eceae3]">
        <SmoothScroll />
        <Companion />
        <HeroWorld />
        <Tools />
        <Where />
        <Product />
        <Dawn />
        <Fix />
        <Inventory />
        <Setup />
        <Price />
        <Faq />
        <FounderNote />
        <ClosingWorld />
      </div>
    </MotionConfig>
  );
}
