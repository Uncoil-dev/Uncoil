import type { Metadata } from "next";
import { EditorialPage } from "@/components/marketing/lab/editorial/editorial-page";

// Unlinked design concept. Kept out of search and out of the sitemap.
export const metadata: Metadata = {
  title: "Editorial concept",
  robots: { index: false, follow: false },
};

export default function EditorialLabPage() {
  return (
    <main id="main-content">
      <EditorialPage />
    </main>
  );
}
