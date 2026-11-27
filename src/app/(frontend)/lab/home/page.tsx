import type { Metadata } from "next";
import { LabHomePage } from "@/components/marketing/lab/home/home-page";

// Unlinked homepage concept that combines the pixel-world and editorial concepts.
// Kept out of search results and out of the sitemap.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Combined homepage concept" },
  robots: { index: false, follow: false },
};

export default function LabHome() {
  return (
    <main id="main-content" className="min-h-screen bg-[#090909]">
      <LabHomePage />
    </main>
  );
}
