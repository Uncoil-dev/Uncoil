"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Dark page opener shared by every inner marketing page: dithered artwork,
 * a pixel headline and an optional action row. Sits directly under the nav.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  image = "/images/landing/horizon-sun.png",
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  image?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-[#090909] text-[#eceae3]">
      <Image src={image} alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover opacity-60 [image-rendering:pixelated]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#090909_10%,rgba(9,9,9,0.55)_60%,rgba(9,9,9,0.2)_100%),linear-gradient(to_top,#090909_0%,rgba(9,9,9,0)_40%)]" />
      <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-10 md:px-8 md:pb-16 md:pt-16">
        <motion.p
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          className="mt-4 max-w-4xl font-pixel text-[clamp(2.6rem,6vw,5.25rem)] leading-[0.88] tracking-[-0.06em]"
          initial={reduce ? false : { y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          {title}
        </motion.h1>
        {lede && (
          <motion.p
            className="mt-5 max-w-xl text-base leading-7 text-white/75 md:text-lg"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease }}
          >
            {lede}
          </motion.p>
        )}
        {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
