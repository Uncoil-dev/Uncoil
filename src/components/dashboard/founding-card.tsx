/** Billing-page reminder of the founding-member deal; rendered only while the coupon is live. */
export function FoundingCard() {
  return (
    <div className="flex flex-wrap items-center gap-3 border-2 border-black bg-[#f4d44d] px-5 py-4 text-sm text-black" data-testid="founding-card">
      <span className="bg-black px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#f4d44d]">Founding members</span>
      <p>The first 20 paying teams get 40% off Pro or Team, for as long as they stay. It is applied automatically at checkout.</p>
    </div>
  );
}
