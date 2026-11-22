import "./(frontend)/globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import { StatusScene, statusButton, statusButtonGhost } from "@/components/brand/status-scene";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const geistPixelSquare = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel-square",
  weight: "500",
  fallback: ["Geist Mono", "ui-monospace", "monospace"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Page not found | Uncoil",
  robots: { index: false, follow: false },
};

// Rendered for URLs that match no route. Pages that call notFound() use the
// segment not-found files instead, which keep the site layout around them.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${geistPixelSquare.variable} h-full`}>
      <body className="min-h-full bg-[#090909] text-[#eceae3]">
        <main className="flex min-h-svh items-center justify-center bg-[#090909] px-4 py-12 sm:px-6">
          <StatusScene
            code="404"
            label="not found"
            title="This trace stops here."
            body="The page you asked for doesn't exist, has moved, or belongs to a project you can't open."
            broken
            actions={
              <>
                <Link href="/dashboard" className={statusButton}>Go to dashboard</Link>
                <Link href="/" className={statusButtonGhost}>Back home</Link>
              </>
            }
          />
        </main>
      </body>
    </html>
  );
}
