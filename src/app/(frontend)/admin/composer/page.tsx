import type { Metadata } from "next";
import { HomepageComposer } from "@/components/marketing/homepage-composer";
import { requireLibraryAccess } from "@/lib/library-access";

export const metadata: Metadata = {
  title: "Homepage composer — Uncoil",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HomepageComposerPage() {
  await requireLibraryAccess("/admin/composer");
  return <HomepageComposer />;
}
