import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardAssistant } from "@/components/dashboard/assistant/assistant-panel";


export const dynamic = "force-dynamic";
export const metadata: Metadata = noIndex;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <><DashboardShell canAccessContent={true}>{children}</DashboardShell><DashboardAssistant /></>;
}
