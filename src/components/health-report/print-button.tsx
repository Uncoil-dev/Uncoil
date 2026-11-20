"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center bg-[#f4d44d] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black outline outline-2 outline-black hover:bg-black hover:text-[#f4d44d] print:hidden">
      Save as PDF
    </button>
  );
}
