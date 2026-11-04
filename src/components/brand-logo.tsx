import { cn } from "@/lib/utils";

/**
 * Canonical Uncoil logo: the official Dissolve lockup (icon + pixel name).
 * Smooth-scaling copies of the originals in public/logos/uncoil, so it stays
 * clean at small sizes. Size it with font-size (height is 1.4em).
 */
export function BrandLogo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === "light" ? "/logos/uncoil/uncoil-sidebar-on-light.svg" : "/logos/uncoil/uncoil-sidebar-on-dark.svg"}
      alt="Uncoil"
      className={cn("block h-[1.4em] w-auto max-w-none text-2xl", className)}
    />
  );
}
