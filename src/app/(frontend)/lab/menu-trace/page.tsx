import type { Metadata } from "next";
import { MenuTraceDemo } from "@/components/marketing/lab/menu-trace/menu-trace-demo";

// Unlinked phone menu concept: the site shown as a trace. Kept out of search results and the sitemap.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Phone menu concept" },
  robots: { index: false, follow: false },
};

export default function LabMenuTrace() {
  return (
    <main id="main-content">
      <MenuTraceDemo />
    </main>
  );
}
