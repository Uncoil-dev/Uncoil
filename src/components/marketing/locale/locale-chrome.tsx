"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TracifyMark } from "@/components/brand/tracify-mark";
import { getCopy, htmlLang, localizedPath, type Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "./locale-switcher";

/** Compact translated header for the Norwegian and German pages. */
export function LocaleNav({ locale }: { locale: Locale }) {
  const t = getCopy(locale).nav;
  useEffect(() => {
    // The root layout is shared and renders lang="en"; correct it while a translated page is open.
    const previous = document.documentElement.lang;
    document.documentElement.lang = htmlLang[locale];
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090909]/90 text-[#eceae3] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8">
        <Link href={localizedPath(locale, "/")} aria-label="Uncoil" className="flex items-baseline gap-[0.12em] font-pixel text-2xl">
          <TracifyMark className="block translate-y-[0.03em]" />
          <span className="tracking-[-0.06em]">uncoil</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-5">
          <Link href={localizedPath(locale, "/pricing")} className="hidden px-2 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/75 hover:text-white sm:block">{t.pricing}</Link>
          <Link href="/docs" className="hidden px-2 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/75 hover:text-white sm:block">{t.docs}</Link>
          <LocaleSwitcher />
          <Link href="/cloud?next=/sign-in" className="hidden px-2 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/75 hover:text-white md:block">{t.signIn}</Link>
          <Link href="/cloud?next=/sign-up" className="bg-[#f4d44d] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:bg-white md:px-4">{t.start}</Link>
        </div>
      </div>
    </header>
  );
}

export function LocaleFooter({ locale }: { locale: Locale }) {
  const t = getCopy(locale).footer;
  return (
    <footer className="bg-[#090909] text-[#eceae3]">
      <div className="mx-auto max-w-[1440px] border-t border-white/15 px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-pixel text-4xl leading-none tracking-[-0.06em] md:text-5xl">{t.tagline}</p>
            {t.note && <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">{t.note}</p>}
          </div>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {t.links.map(([label, href]) => (
              <li key={href}><Link href={href} className="text-sm text-white/70 hover:text-white">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Uncoil</span>
          <div className="flex flex-wrap gap-5">
            {t.legal.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-white">{label}</Link>
            ))}
          </div>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
