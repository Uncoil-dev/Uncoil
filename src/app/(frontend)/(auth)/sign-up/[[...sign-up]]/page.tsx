import { AuthSceneShell } from "@/components/auth/auth-scene-shell";
import { BetterAuthForm } from "@/components/auth/better-auth-form";
import { PlanTeaser } from "@/components/auth/plan-teaser";

export const revalidate = 300;

// The previous shell is AuthShell from "@/components/auth/auth-shell", which the other auth pages still use.
export default function SignUpPage() {
  return (
    <AuthSceneShell mode="sign-up">
      <BetterAuthForm mode="sign-up" />
      <PlanTeaser founding={Boolean(process.env.STRIPE_FOUNDING_COUPON_ID)} />
    </AuthSceneShell>
  );
}
