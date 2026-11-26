import type { Metadata } from "next";
import { MenuConsoleDemo } from "@/components/marketing/lab/menu-console/menu-console-demo";

export const metadata: Metadata = {
  title: "Menu concept — Uncoil",
  robots: { index: false, follow: false, nocache: true },
};

export default function MenuConsolePage() {
  return <MenuConsoleDemo />;
}
