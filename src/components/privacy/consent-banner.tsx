"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultConsent, hasCurrentConsent, readConsent, writeConsent, type ConsentState } from "@/lib/consent";
import { getCopy, localeFromPath } from "@/lib/i18n";

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-[13px] text-[#eceae3]">{label}</span>
        <span className="mt-0.5 block text-xs leading-4 text-white/50">{hint}</span>
      </span>
      <input aria-label={label} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} className="size-4 shrink-0 accent-[#f4d44d]" />
    </label>
  );
}

export function ConsentBanner() {
  const pathname = usePathname();
  const t = getCopy(localeFromPath(pathname)).consent;
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Consent is browser-owned state; initialize it after hydration to avoid a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    setVisible(!hasCurrentConsent());
  }, []);
  useEffect(() => { const reopen = () => { setConsent(readConsent()); setOpen(true); setVisible(true); }; window.addEventListener("uncoil:open-consent", reopen); return () => window.removeEventListener("uncoil:open-consent", reopen); }, []);
  // The authenticated dashboard and public Sandbox are reference-captured
  // surfaces; the marketing consent chrome is intentionally outside them.
  if (pathname === "/playground" || pathname.startsWith("/playground/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return null;
  if (!visible) return null;
  function save(analytics: boolean, marketing = false) { const next = writeConsent({ analytics, marketing }); setConsent(next); setVisible(false); setOpen(false); }
  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="consent-title" className="consent-in fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-auto border border-white/20 bg-[#090909]/95 p-5 text-[#eceae3] backdrop-blur-md md:inset-x-auto md:bottom-5 md:left-5 md:w-[400px]">
      <div className="flex items-center gap-2">
        <span className="size-2 bg-[#f4d44d]" aria-hidden="true" />
        <p id="consent-title" className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">{t.title}</p>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-white/75">{t.body}</p>
      {open && (
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          <Toggle label={t.necessary} hint={t.necessaryHint} checked disabled />
          <Toggle label={t.analytics} hint={t.analyticsHint} checked={consent.analytics} onChange={(v) => setConsent({ ...consent, analytics: v })} />
          <Toggle label={t.marketing} hint={t.marketingHint} checked={consent.marketing} onChange={(v) => setConsent({ ...consent, marketing: v })} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/55">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-white">{t.privacy}</Link>
        <Link href="/cookie-policy" className="underline underline-offset-2 hover:text-white">{t.cookies}</Link>
        <button type="button" onClick={() => (open ? save(consent.analytics, consent.marketing) : setOpen(true))} className="ml-auto min-h-8 underline underline-offset-2 hover:text-white">{open ? t.save : t.preferences}</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => save(false, false)} className="min-h-11 border border-white/30 px-3 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-white hover:text-black">{t.reject}</button>
        <button type="button" onClick={() => save(true, false)} className="min-h-11 bg-[#f4d44d] px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-black hover:bg-white">{t.accept}</button>
      </div>
    </aside>
  );
}
