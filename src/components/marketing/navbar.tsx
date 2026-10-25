"use client";

import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  Braces,
  ChartNoAxesCombined,
  CircleGauge,
  Code2,
  FlaskConical,
  Headphones,
  Mail,
  Menu,
  Newspaper,
  Orbit,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { authClient } from "@/lib/auth-client";

const menus = {
  Product: [
    ["Observe", "Traces · sessions · costs", "/product/trace-viewer"],
    [
      "Improve",
      "Evaluations · datasets · prompts",
      "/product/evaluation-engine",
    ],
    ["Release", "Experiments · gates · monitors", "/product/lifecycle"],
    ["Operate", "Alerts · reports · integrations", "/integrations"],
  ],
  Solutions: [
    [
      "Support",
      "Find the decision behind every escalation",
      "/use-cases/support",
    ],
    ["Research", "Verify multi-step investigations", "/use-cases/research"],
    ["Automation", "Debug workflows and retry chains", "/use-cases/automation"],
    ["Tool calling", "Catch failed APIs and loops", "/use-cases/tool-calling"],
  ],
  Developers: [
    ["Docs", "Install and send your first trace", "/docs"],
    ["TypeScript SDK", "Trace Node and Next.js agents", "/docs/typescript"],
    ["Python SDK", "Instrument with a decorator", "/docs/python"],
    ["API reference", "Ingest from custom runtimes", "/docs/api"],
  ],
  Company: [
    ["Blog", "Agent engineering notes", "/blog"],
    ["Roadmap", "What is shipping next", "/roadmap"],
    ["Security", "How Tracify handles data", "/security"],
    ["Contact", "Talk through your stack", "/contact"],
  ],
} as const;

const featured = {
  Product: {
    eyebrow: "Featured / product tour",
    title: "See the full agent improvement loop.",
    body: "Trace a run, evaluate the output, compare changes, and ship with evidence.",
    href: appHref("/demo/project"),
    label: "Open the demo",
  },
  Solutions: {
    eyebrow: "Featured / support workflow",
    title: "When an agent gives the wrong answer.",
    body: "Follow a customer-facing failure back to the exact decision, tool call, and prompt version.",
    href: "/use-cases/support",
    label: "Explore support",
  },
  Developers: {
    eyebrow: "Featured / quickstart",
    title: "Your first trace, from zero to visible.",
    body: "Install the SDK, send one run, and start inspecting your agent in minutes.",
    href: "/docs",
    label: "Open the quickstart",
  },
  Company: {
    eyebrow: "Featured / field guide",
    title: "AI agent observability, explained.",
    body: "A practical guide to traces, evaluations, cost, prompts, and production decisions.",
    href: "/blog/ai-agent-observability-complete-guide",
    label: "Read the complete guide",
  },
} satisfies Record<MenuName, { eyebrow: string; title: string; body: string; href: string; label: string }>;

const mobileMenuMeta = {
  Product: {
    summary: "Observe, improve, release, and operate with confidence.",
    icons: [Activity, Sparkles, Rocket, CircleGauge],
  },
  Solutions: {
    summary: "Purpose-built paths for the work your agents do.",
    icons: [Headphones, FlaskConical, Orbit, Wrench],
  },
  Developers: {
    summary: "Guides, SDKs, and the complete ingest surface.",
    icons: [BookOpen, Code2, Braces, Bot],
  },
  Company: {
    summary: "The record behind the product and the people building it.",
    icons: [Newspaper, ChartNoAxesCombined, ShieldCheck, Mail],
  },
} satisfies Record<keyof typeof menus, { summary: string; icons: typeof Activity[] }>;

type MenuName = keyof typeof menus;

export function Navbar() {
  const [active, setActive] = useState<MenuName | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function signOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
  }
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        onMouseLeave={() => setActive(null)}
        className="w-full border-b border-black/20 bg-[#eceae3] text-black shadow-[0_8px_0_rgba(0,0,0,0.22)]"
      >
        <div className="flex h-[54px] items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Tracify home"
            className="active-press focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <BrandLogo />
          </Link>
          <nav className="hidden h-full items-center gap-7 font-mono text-[9px] uppercase tracking-[0.12em] md:flex">
            <Link href="/pricing" className="flex h-full items-center border-b-2 border-transparent normal-case hover:border-black/35">Pricing</Link>
            {(Object.keys(menus) as MenuName[]).map((name) => (
              <button
                key={name}
                type="button"
                onMouseEnter={() => setActive(name)}
                onFocus={() => setActive(name)}
                onClick={() =>
                  setActive((current) => (current === name ? null : name))
                }
                aria-expanded={active === name}
                className={`h-full border-b-2 transition-colors ${active === name ? "border-black" : "border-transparent hover:border-black/35"}`}
              >
                {name}
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="font-mono text-[8px] uppercase tracking-[0.12em] text-black/55 hover:text-black"
                >
                  Sign out
                </button>
                <Link
                  href={appHref("/dashboard")}
                  className="bg-black px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/cloud?next=/sign-in"
                  className="px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em] hover:bg-black/5"
                >
                  Sign in
                </Link>
                <Link
                  href="/cloud?next=/sign-up"
                  className="bg-black px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black"
                >
                  Start free
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
            className="md:hidden"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
        <div>
          {active ? (
            <DesktopPanel name={active} onClose={() => setActive(null)} />
          ) : null}
        </div>
        {mobileOpen ? (
          <MobilePanel onClose={() => setMobileOpen(false)} />
        ) : null}
      </div>
    </header>
  );
}

function DesktopPanel({
  name,
  onClose,
}: {
  name: MenuName;
  onClose: () => void;
}) {
  return (
    <div className="grid border-t border-black/15 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="grid sm:grid-cols-2">
        {menus[name].map(([title, body, href]) => (
          <Link
            onClick={onClose}
            key={title}
            href={href}
            className="border-b border-r border-black/10 p-6 transition-colors hover:bg-[#f4d44d]"
          >
            <p className="font-pixel text-4xl tracking-[-0.06em]">{title}</p>
            <p className="mt-3 text-xs leading-5 text-black/55">{body}</p>
          </Link>
        ))}
      </div>
      <div className="bg-black p-7 text-white">
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">
          {featured[name].eyebrow}
        </p>
        <p className="mt-10 font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
          {featured[name].title}
        </p>
        <p className="mt-6 max-w-sm text-sm leading-6 text-zinc-400">
          {featured[name].body}
        </p>
        <Link
          onClick={onClose}
          href={featured[name].href}
          className="mt-10 inline-block border-b border-[#f4d44d] pb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#f4d44d]"
        >
          {featured[name].label}
        </Link>
      </div>
    </div>
  );
}

function MobilePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [activeSection, setActiveSection] = useState<MenuName | null>(null);

  async function signOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
    onClose();
  }

  return (
    <div className="max-h-[calc(100dvh-54px)] overflow-y-auto border-t border-black bg-[#eceae3] md:hidden">
      {(Object.keys(menus) as MenuName[]).map((name, sectionIndex) => {
        const expanded = activeSection === name;
        const meta = mobileMenuMeta[name];

        return (
          <section
            key={name}
            className={expanded ? "bg-[#f4d44d]" : "bg-[#eceae3]"}
          >
            <button
              type="button"
              onClick={() =>
                setActiveSection((current) => (current === name ? null : name))
              }
              aria-expanded={expanded}
              aria-controls={`mobile-nav-${name.toLowerCase()}`}
              className="grid min-h-24 w-full grid-cols-[64px_1fr_32px] items-center gap-3 border-t border-black px-4 py-4 text-left focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
            >
              <span className="font-pixel text-5xl leading-none tracking-[-0.07em]">
                0{sectionIndex + 1}
              </span>
              <span>
                <span className="block font-pixel text-3xl leading-none tracking-[-0.05em]">
                  {name}
                </span>
                <span className="mt-2 block max-w-[28ch] text-sm leading-5 text-black/65">
                  {meta.summary}
                </span>
              </span>
              <span className="font-mono text-3xl leading-none" aria-hidden="true">
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded ? (
              <div
                id={`mobile-nav-${name.toLowerCase()}`}
                className="border-t border-black px-4 pb-4 pt-4"
              >
                <div className="grid grid-cols-2 border-l border-t border-black">
                  {menus[name].map(([title, body, href], itemIndex) => {
                    const Icon = meta.icons[itemIndex];
                    return (
                      <Link
                        onClick={onClose}
                        key={title}
                        href={href}
                        className="group flex min-h-40 flex-col justify-between border-b border-r border-black bg-[#f4d44d] p-4 transition-colors hover:bg-black hover:text-white focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </div>
                        <div>
                          <span className="font-pixel text-[1.65rem] leading-none tracking-[-0.05em]">
                            {title}
                          </span>
                          <span className="mt-2 line-clamp-2 block text-sm leading-5 opacity-65">
                            {body}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {name === "Product" ? (
                  <Link
                    onClick={onClose}
                    href="/pricing"
                    className="mt-4 flex min-h-20 items-center justify-between border border-black bg-[#f4d44d] px-5 py-4 font-pixel text-3xl tracking-[-0.05em] transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
                  >
                    <span>Pricing</span>
                    <span className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.14em]">
                      Rate card
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}

      <div className="sticky bottom-0 border-t border-black bg-black p-4 text-white">
        {session ? (
          <>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mb-3 min-h-12 w-full border border-white/35 px-4 font-mono text-xs uppercase tracking-[0.14em] text-white/70 hover:border-white hover:text-white"
            >
              Sign out
            </button>
            <Link
              onClick={onClose}
              href={appHref("/dashboard")}
              className="flex min-h-16 w-full items-center justify-between bg-white px-5 font-mono text-xs uppercase tracking-[0.14em] text-black"
            >
              <span>Open dashboard</span>
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
          <Link
            onClick={onClose}
            href="/cloud?next=/sign-in"
            className="flex min-h-16 w-full items-center justify-between border border-black bg-white px-1 font-mono text-xs uppercase tracking-[0.14em] text-black"
          >
            <span>Sign in</span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <Link
            onClick={onClose}
            href="/cloud?next=/sign-up"
            className="flex min-h-16 w-full items-center justify-between bg-black px-1 font-mono text-xs uppercase tracking-[0.14em] text-white"
          >
            <span>
              <span className="block">Start free</span>
              <span className="mt-1 block text-[9px] text-white/50">No credit card required</span>
            </span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          </>
        )}
      </div>
    </div>
  );
}
