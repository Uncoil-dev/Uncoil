import { AuthShell } from "@/components/auth/auth-shell";
import { BetterAuthForm } from "@/components/auth/better-auth-form";
import { PlanTeaser } from "@/components/auth/plan-teaser";

export const revalidate = 300;

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <BetterAuthForm mode="sign-up" />
      <PlanTeaser founding={Boolean(process.env.STRIPE_FOUNDING_COUPON_ID)} />
    </AuthShell>
  );
}
