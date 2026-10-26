import { formatPrice, plans } from "@/lib/pricing-plans";

/** Short free-vs-paid line under the sign-up form, so nobody wonders what the free plan covers. */
export function PlanTeaser({ founding = false }: { founding?: boolean }) {
  const free = plans[0];
  const pro = plans[1];
  return (
    <div className="mt-4 border border-black/30 bg-[#eceae3] px-5 py-4 text-sm text-black" data-testid="signup-plan-teaser">
      <p>
        <strong>Free:</strong> {free.spans} spans a month, {free.retention} history, no card. <strong>Pro</strong> ({formatPrice(pro.monthly)}/mo): {pro.spans} spans, {pro.retention} history, Slack alerts.
      </p>
      {founding && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className="bg-black px-1.5 py-0.5 text-[#f4d44d]">Founding deal</span> First 20 paying teams get 40% off, for good.
        </p>
      )}
    </div>
  );
}
