"use client";

import { appHref } from "@/lib/app-links";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * FinalCTA Component
 * 
 * A compact, terminal-styled conversion section for the tracify landing page.
 * Follows a strict monochrome, 0px radius, and developer-grade aesthetic.
 */
export function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="py-[80px] pb-[96px] px-6 mx-auto max-w-[1200px] w-full"
      style={{ backgroundColor: "#050505" }}
    >
      <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-[28px] md:p-[40px] flex flex-col md:flex-row items-center md:items-stretch gap-12 md:gap-0">
        {/* Left Content: 55% */}
        <div className="w-full md:w-[55%] flex flex-col gap-6">
          <h2 className="font-mono text-white text-[30px] md:text-[44px] leading-[1.1] font-bold tracking-tight">
            Run your first trace.
          </h2>
          <p className="font-sans text-[#CCCCCC] text-[15px] md:text-[16px] leading-[1.6] max-w-[520px]">
            Instrument your agent, run it once, and see every step it takes.
          </p>
          <p className="font-mono text-[#666666] text-[12px] md:text-[13px]">
            Free plan included. No credit card. First trace in minutes.
          </p>
        </div>

        {/* Right Content: 45% */}
        <div className="w-full md:w-[45%] flex flex-col gap-8 md:pl-10 justify-between">
          {/* Command Snippet */}
          <div
            className="border border-[#2A2A2A] bg-[#050505] p-4 font-mono text-[12px] md:text-[13px] leading-[1.6] w-full"
          >
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <span className="text-[#666666] shrink-0">$</span>
                <span className="text-[#999999]">pip install tracify-sdk</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#666666] shrink-0">$</span>
                <span className="text-[#999999]">npm install tracify-sdk</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[#666666] shrink-0">$</span>
                <span className="text-[#999999]">run-agent</span>
              </div>
              <div className="text-[#34D399] mt-1 font-bold">
                trace ready: run_8f21a9
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mt-auto">
            <Link href={appHref("/sign-up")} className="w-full md:w-auto">
              <Button
                variant="default"
                className="w-full md:w-auto font-mono text-[13px] h-11 px-8 uppercase"
              >
                Start free
              </Button>
            </Link>
            <Link href="/docs" className="w-full md:w-auto">
              <Button
                variant="outline"
                className="w-full md:w-auto font-mono text-[13px] h-11 px-8 uppercase"
              >
                Read the docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
