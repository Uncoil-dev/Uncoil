import { Suspense } from "react";
import { CliLoginConfirm } from "@/components/auth/cli-login-confirm";

export default function CliLoginPage() {
  return <Suspense><CliLoginConfirm /></Suspense>;
}
