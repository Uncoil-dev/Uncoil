// One small type, spacing and button system for the whole page, so every section is set by the
// same hand: one hero size, one section headline, one sub-headline, one body and one label size,
// one section rhythm, two rule strengths and two button styles.

/** The hero and the closing line. */
export const HERO = "font-pixel normal-case text-[clamp(2.9rem,min(8.6vw,13svh),8.5rem)] leading-[0.88] tracking-[-0.07em]";
/** Every section headline. */
export const H2 = "font-pixel normal-case text-[clamp(2.6rem,5.8vw,5.75rem)] leading-[0.9] tracking-[-0.07em] text-balance";
/** Sub-headlines inside a section: panels, the line under a big figure, plan names. */
export const H3 = "font-pixel normal-case text-[clamp(1.9rem,3.4vw,3.25rem)] leading-[0.92] tracking-[-0.06em] text-balance";
/** Prose. */
export const BODY = "text-base leading-7 md:text-lg md:leading-8";
/** Small mono labels: eyebrows, captions, meta. */
export const LABEL = "font-mono text-[10px] uppercase tracking-[0.16em]";

/** Section rhythm: the pixel seams already give the space above, so the top pad is shorter. */
export const SECTION = "px-5 pb-20 pt-10 md:px-10 md:pb-28 md:pt-14";
export const WRAP = "mx-auto w-full max-w-[1320px]";
/** Gap between the section eyebrow and its headline, and between the headline and its art. */
export const AFTER_EYEBROW = "mt-10 md:mt-12";
export const AFTER_HEADLINE = "mt-10 md:mt-14";

const BUTTON = "group inline-flex min-h-14 items-center justify-center gap-3 px-7 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-[transform,box-shadow,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-xs";

/** The one primary action style. `on` is the colour of the ground the button sits on. */
export function primary(on: "ink" | "cream") {
  return `${BUTTON} bg-[#f4d44d] text-black ${
    on === "ink"
      ? "shadow-[5px_5px_0_0_#eceae3] hover:shadow-[8px_8px_0_0_#eceae3] focus-visible:outline-[#eceae3]"
      : "border-2 border-black shadow-[5px_5px_0_0_#090909] hover:shadow-[8px_8px_0_0_#090909] focus-visible:outline-[#090909]"
  } hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0`;
}

/** The one secondary action style. */
export function secondary(on: "ink" | "cream") {
  return `${BUTTON} border-2 ${
    on === "ink"
      ? "border-[#eceae3] bg-[#090909] text-[#eceae3] hover:bg-[#eceae3] hover:text-black focus-visible:outline-[#eceae3]"
      : "border-black bg-[#eceae3] text-black hover:bg-black hover:text-[#eceae3] focus-visible:outline-[#090909]"
  }`;
}

/** Shared reveal timing: one easing curve and three durations. */
export const EASE = [0.23, 1, 0.32, 1] as const;
export const DUR = { fast: 0.25, base: 0.5, slow: 0.9 } as const;
