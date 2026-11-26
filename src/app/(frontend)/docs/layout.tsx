import { toDockLinks } from "@/lib/docs-search";
import { getDocs } from "@/lib/markdoc-docs";
import { DocsDock } from "@/components/docs/docs-dock";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const links = toDockLinks(getDocs());
  return (
    <>
      {children}
      <div aria-hidden className="h-20 bg-[#eceae3]" />
      <DocsDock links={links} />
    </>
  );
}
