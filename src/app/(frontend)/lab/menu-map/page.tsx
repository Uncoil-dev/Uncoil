import type { Metadata } from "next";
import { MenuMapDemo } from "@/components/marketing/lab/menu-map/menu-map-demo";

// An unlinked phone menu concept. It stays out of search results and the sitemap.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Phone menu concept, world map" },
  robots: { index: false, follow: false },
};

export default async function MenuMapConcept({ searchParams }: { searchParams: Promise<{ at?: string | string[] }> }) {
  const { at } = await searchParams;
  // `?at=/docs/python` previews the menu as it opens on that page.
  const path = typeof at === "string" && at.startsWith("/") ? at : "/";
  return (
    <main id="main-content" className="min-h-screen bg-[#090909]">
      <MenuMapDemo path={path} />
    </main>
  );
}
