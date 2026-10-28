import { UncoilMark } from "@/components/brand/uncoil-mark";
import { cn } from "@/lib/utils";

/** Canonical Uncoil logo (icon + name). Keep every product-shell logo on this component. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span aria-label="Uncoil" className={cn("inline-flex items-baseline gap-[0.12em] font-pixel text-2xl leading-none", className)}>
      <UncoilMark className="block translate-y-[0.03em]" />
      <span className="tracking-[-0.06em]">uncoil</span>
    </span>
  );
}
