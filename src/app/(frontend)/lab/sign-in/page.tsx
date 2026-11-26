import type { Metadata } from "next";
import { BetterAuthForm } from "@/components/auth/better-auth-form";
import { LabAuthShell } from "@/components/auth/lab/lab-auth-shell";

// Unlinked design concept for the sign-in page, rendering the same form as /sign-in.
// Kept out of search results and out of the sitemap.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Sign-in concept" },
  robots: { index: false, follow: false },
};

export default function LabSignInPage() {
  return (
    <LabAuthShell mode="sign-in">
      <BetterAuthForm mode="sign-in" />
    </LabAuthShell>
  );
}
