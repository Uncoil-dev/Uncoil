import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Pricing", description: "Explore Uncoil pricing for AI agent observability, evaluation, cost monitoring, and reliability workflows.", path: "/pricing" });

export default function PricingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
