import { UncoilMark } from "./uncoil-mark";

/** Full-screen loading state: the Dissolve mark wiping in, nothing else (covers any navbar/sidebar). */
export function BrandLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#090909]" role="status" aria-live="polite" aria-label={label}>
      <div className="relative" aria-hidden="true">
        <UncoilMark className="h-auto w-28 opacity-[0.14] sm:w-36" />
        <UncoilMark className="absolute inset-0 h-auto w-28 animate-[brand-loader_1.8s_ease-in-out_infinite] motion-reduce:animate-none sm:w-36" />
      </div>
      <span className="sr-only">{label}</span>
      <style>{`@keyframes brand-loader{0%{clip-path:inset(0 100% 0 0);opacity:1}55%,75%{clip-path:inset(0 0 0 0);opacity:1}100%{clip-path:inset(0 0 0 0);opacity:0}}`}</style>
    </div>
  );
}
