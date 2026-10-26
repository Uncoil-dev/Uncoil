import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";


export const dynamic = "force-dynamic";
export const metadata: Metadata = noIndex;

export default function CliLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
