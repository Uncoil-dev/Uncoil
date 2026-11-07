import { redirect } from "next/navigation";

// The waiting screen is part of "Send your first run" now. Old links still land there.
export default function OnboardingWaitingPage() {
  redirect("/onboarding/install");
}
