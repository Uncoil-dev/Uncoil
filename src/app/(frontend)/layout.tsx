import "./globals.css";
import { SiteRoot, rootMetadata } from "@/components/site-root";

export const metadata = rootMetadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteRoot>{children}</SiteRoot>;
}
