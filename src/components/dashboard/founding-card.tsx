/** Billing-page reminder of the founding-member deal; rendered only while the coupon is live. */
export function FoundingCard() {
  return (
    <div className="flex flex-wrap items-center gap-3 border border-[#F4D44D]/50 bg-[#0E1115] px-5 py-4 text-[13px] text-[#E6E9EE]" data-testid="founding-card">
      <span className="bg-[#F4D44D] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0B0D10]">Founding members</span>
      <p>The first 20 paying teams get 40% off Pro or Team, for as long as they stay. Add the founding code at checkout.</p>
    </div>
  );
}
