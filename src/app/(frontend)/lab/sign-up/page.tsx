import type { Metadata } from "next";
import { BetterAuthForm } from "@/components/auth/better-auth-form";
import { LabAuthShell } from "@/components/auth/lab/lab-auth-shell";

// Unlinked design concept for the sign-up page, rendering the same form as /sign-up.
// Kept out of search results and out of the sitemap.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Uncoil | Sign-up concept" },
  robots: { index: false, follow: false },
};

export default function LabSignUpPage() {
  return (
    <LabAuthShell mode="sign-up">
      <BetterAuthForm mode="sign-up" />
    </LabAuthShell>
  );
}
