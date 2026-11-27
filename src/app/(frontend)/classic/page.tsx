import { LandingPage } from "@/components/marketing/landing/landing-page";
import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";

// The previous homepage, kept viewable so it can be compared with the current one or switched back
// to (see src/lib/homepage.ts). Unlinked, out of the sitemap and out of search results.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Previous homepage" },
  ...noIndex,
};

export default function ClassicHome() {
  return (
    <div className="min-h-screen bg-[#090909]">
      <main id="main-content">
        <LandingPage />
      </main>
    </div>
  );
}
