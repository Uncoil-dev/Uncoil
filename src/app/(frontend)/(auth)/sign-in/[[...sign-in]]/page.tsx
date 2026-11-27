import { AuthSceneShell } from "@/components/auth/auth-scene-shell";
import { BetterAuthForm } from "@/components/auth/better-auth-form";

// The previous shell is AuthShell from "@/components/auth/auth-shell", which the other auth pages still use.
export default function SignInPage() {
  return (
    <AuthSceneShell mode="sign-in">
      <BetterAuthForm mode="sign-in" />
    </AuthSceneShell>
  );
}
