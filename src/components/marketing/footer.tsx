import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NewsletterCapture } from "@/components/marketing/newsletter-capture";

const footerGroups = [
  [
    "Product",
    [
      ["Trace viewer", "/product/trace-viewer"],
      ["Pricing", "/pricing"],
      ["Integrations", "/integrations"],
    ],
  ],
  [
    "Developers",
    [
      ["Docs", "/docs"],
      ["Quickstart", "/docs/typescript"],
      ["API reference", "/docs/api"],
    ],
  ],
  [
    "Company",
    [
      ["Blog", "/blog"],
      ["Security", "/security"],
      ["Contact", "/contact"],
    ],
  ],
  [
    "Resources",
    [
      ["Status", "/status"],
      ["Changelog", "/changelog"],
      ["Privacy", "/privacy"],
    ],
  ],
] as const;

export function Footer() {
  return (
    <footer className="overflow-hidden bg-[#eceae3] px-6 pt-20 text-black md:px-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 border-b border-black/15 pb-14 md:grid-cols-[1fr_auto]">
          <div>
            <Link
              href="/"
              aria-label="Uncoil home"
              className="inline-block focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <BrandLogo className="text-3xl" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-black/55">
              The operating record for the agents your team ships.
            </p>
            <div className="mt-7">
              <NewsletterCapture inverse />
            </div>
            {/*
              <input type="hidden" name="intent" value="newsletter" />
              <label htmlFor="site-newsletter" className="sr-only">
                Work email for the Uncoil newsletter
              </label>
              <input
                id="site-newsletter"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-[10px] outline-none placeholder:text-black/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
              />
              <button
                type="submit"
                className="bg-black px-4 font-mono text-[9px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Subscribe
              </button>
            </form> */}
            <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.11em] text-black/55">
              One technical dispatch a month. Unsubscribe anytime.
            </p>
            <Link
              href={appHref("/sign-up")}
              className="mt-6 inline-flex items-center gap-3 bg-black px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Start free <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            {footerGroups.map(([title, links]) => (
              <div
                key={title}
                className="space-y-3 font-mono text-[9px] uppercase tracking-[0.11em]"
              >
                <p>{title}</p>
                {links.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block text-black/55 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="select-none pt-8 font-pixel text-[clamp(5.5rem,18.2vw,18rem)] leading-[0.66] tracking-[-0.1em] text-black">
          uncoil
        </div>
      </div>
      <div className="h-4 bg-[#f4d44d]" />
    </footer>
  );
}
