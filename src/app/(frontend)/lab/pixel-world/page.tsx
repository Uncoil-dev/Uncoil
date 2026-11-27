import type { Metadata } from "next";
import { PixelWorldPage } from "@/components/marketing/lab/pixel-world/pixel-world-page";

// An unlinked homepage concept. It stays out of search results and the sitemap.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Pixel world concept" },
  robots: { index: false, follow: false },
};

export default function PixelWorld() {
  return (
    <main id="main-content" className="min-h-screen bg-[#090909]">
      <PixelWorldPage />
    </main>
  );
}
