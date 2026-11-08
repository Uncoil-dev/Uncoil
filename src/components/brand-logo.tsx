import { cn } from "@/lib/utils";

/**
 * Canonical Uncoil logo: the Dissolve lockup (icon + pixel name), pixel-snapped.
 * Every logo pixel is exactly 1 CSS pixel (204x38), so edges stay sharp. Never
 * scale it to a non-whole-number size, or the dither blurs again.
 * Source: scripts/generate-crisp-logo.py -> public/logos/uncoil/uncoil-logo-crisp-on-*.svg
 */
export function BrandLogo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tone === "light" ? "/logos/uncoil/uncoil-logo-crisp-on-light.svg" : "/logos/uncoil/uncoil-logo-crisp-on-dark.svg"}
      alt="Uncoil"
      width={204}
      height={38}
      className={cn("block h-[38px] w-[204px] max-w-none", className)}
    />
  );
}
