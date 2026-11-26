import type { Metadata } from "next";
import { TerminalPage } from "@/components/marketing/lab/terminal/terminal-page";

// Unlinked design concept for the homepage. Kept out of search and out of the sitemap.
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Terminal concept" },
  robots: { index: false, follow: false },
};

export default function LabTerminalPage() {
  return (
    <main id="main-content">
      <TerminalPage />
    </main>
  );
}
