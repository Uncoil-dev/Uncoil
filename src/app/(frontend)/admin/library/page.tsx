import type { Metadata } from "next";
import { CtaExplorations } from "@/components/marketing/cta-explorations";
import { DefinitiveHeroExploration } from "@/components/marketing/definitive-hero-exploration";
import { FooterExplorations } from "@/components/marketing/footer-explorations";
import { LandingExplorations } from "@/components/marketing/landing-explorations";
import { LandingExplorationsMore } from "@/components/marketing/landing-explorations-more";
import { LandingFutureExplorations } from "@/components/marketing/landing-future-explorations";
import { LandingHeroExplorations } from "@/components/marketing/landing-hero-explorations";
import { LandingSurfaceExplorations } from "@/components/marketing/landing-surface-explorations";
import { LeadGenerationExplorations } from "@/components/marketing/lead-generation-explorations";
import { LogoShowcaseExplorations } from "@/components/marketing/logo-showcase-explorations";
import { NavigationSystemExplorations } from "@/components/marketing/navigation-system-explorations";
import { PricingExplorations } from "@/components/marketing/pricing-explorations";
import { SectionLibrary } from "@/components/marketing/section-library";
import { requireLibraryAccess } from "@/lib/library-access";

export const metadata: Metadata = {
  title: "Admin section library — Uncoil",
  description: "Private Uncoil section and conversion concept workspace.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLibraryPage() {
  await requireLibraryAccess();

  return (
    <div className="min-h-screen overflow-x-hidden bg-black pt-[60px] text-white selection:bg-yellow-300/40">
      <main>
        <SectionLibrary />
        <NavigationSystemExplorations />
        <LandingExplorations />
        <LandingExplorationsMore />
        <LandingHeroExplorations />
        <DefinitiveHeroExploration />
        <PricingExplorations />
        <LandingSurfaceExplorations />
        <LandingFutureExplorations />
        <LogoShowcaseExplorations />
        <LeadGenerationExplorations />
        <CtaExplorations />
        <FooterExplorations />
      </main>
    </div>
  );
}
