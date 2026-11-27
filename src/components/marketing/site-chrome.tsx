"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { LandingFooter } from "@/components/marketing/landing/landing-footer";
import { LandingNav } from "@/components/marketing/landing/landing-nav";
import { usesOverlayNav } from "@/lib/homepage";

// The chat widget is closed until clicked, so it does not need to block page load.
const SiteAssistant = dynamic(() => import("@/components/marketing/site-assistant").then((module) => module.SiteAssistant), { ssr: false });

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin" || pathname.startsWith("/dashboard") || pathname.startsWith("/uncoil-preview");
  const isPlayground = pathname.startsWith("/playground") || pathname.startsWith("/demo/project");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isCloudDirectory = pathname.startsWith("/cloud");
  const isCheckout = pathname.startsWith("/pricing/checkout") || pathname.startsWith("/health-report/r/");
  const isAuth = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/accept-invitation", "/auth/error", "/share"].some((route) => pathname.startsWith(route));

  if (isDashboard || isPlayground || isOnboarding || isCheckout || isAuth || isCloudDirectory) return <>{children}</>;

  if (usesOverlayNav(pathname)) {
    return (
      <>
        <LandingNav />
        {children}
        <LandingFooter />
        <SiteAssistant />
      </>
    );
  }

  return (
    <>
      <LandingNav solidAlways />
      <div className="h-16 bg-[#090909]" aria-hidden="true" />
      {children}
      <LandingFooter />
      <SiteAssistant />
    </>
  );
}
