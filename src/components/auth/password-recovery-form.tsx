"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeRelativePath, parseEntryIntent } from "@/lib/navigation-context";

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN";
  const returnPath = safeRelativePath(searchParams.get("redirect_url"), "/dashboard");
  const intent = parseEntryIntent(searchParams.get("intent"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    if (mode === "request") {
      const resetPath = new URL("/reset-password", window.location.origin);
      resetPath.searchParams.set("redirect_url", returnPath);
      if (intent) resetPath.searchParams.set("intent", intent);
      const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: resetPath.toString() });
      setPending(false);
      if (result.error) return setError(result.error.message || "We could not send the reset email.");
      setSent(true);
      return;
    }

    if (!token || invalidToken) {
      setPending(false);
      return setError("This reset link is invalid or has expired.");
    }
    if (password !== confirmPassword) {
      setPending(false);
      return setError("The passwords do not match.");
    }
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) return setError(result.error.message || "We could not reset your password.");
    const signIn = new URL("/sign-in", window.location.origin);
    signIn.searchParams.set("reset", "success");
    signIn.searchParams.set("redirect_url", returnPath);
    if (intent) signIn.searchParams.set("intent", intent);
    router.push(`${signIn.pathname}${signIn.search}`);
  }

  if (sent) return <Status title="Check your inbox" body="If an account exists for that email, a secure reset link is on its way. The link expires in one hour." />;

  return (
    <div>
      <h2 className="font-pixel text-4xl leading-none tracking-[-0.06em]">{mode === "request" ? "Forgot password" : "Set new password"}</h2>
      <p className="mt-3 text-sm leading-6 text-black/55">{mode === "request" ? "Enter your account email and we will send the next step." : "Choose a new password for your uncoil account."}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "request" ? <AuthInput label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /> : <><AuthInput label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} /><AuthInput label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={8} /></>}
        {(error || invalidToken) ? <p role="alert" className="border border-black bg-[#f4d44d] p-3 text-xs leading-5">{error || "This reset link is invalid or has expired."}</p> : null}
        <button disabled={pending || (mode === "request" ? !email.trim() : password.length < 8 || confirmPassword.length < 8 || !token || invalidToken)} className="active-press flex h-12 w-full items-center justify-between bg-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black disabled:opacity-50"><span>{pending ? "Working…" : mode === "request" ? "Send reset link" : "Update password"}</span><ArrowRight className="size-4" /></button>
      </form>
      <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}${intent ? `&intent=${intent}` : ""}`} className="active-press mt-6 inline-flex min-h-11 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-black/55 hover:text-black"><ArrowLeft className="size-3.5" /> Back to sign in</Link>
    </div>
  );
}

function Status({ title, body }: { title: string; body: string }) {
  return <div><div className="mb-6 h-2 w-20 bg-[#f4d44d]" /><h2 className="font-pixel text-4xl tracking-[-0.06em]">{title}</h2><p className="mt-4 text-sm leading-6 text-black/55">{body}</p><Link href="/sign-in" className="active-press mt-7 flex h-12 items-center justify-between bg-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white hover:bg-[#f4d44d] hover:text-black">Return to sign in <ArrowRight className="size-4" /></Link></div>;
}

function AuthInput({ label, type, value, onChange, autoComplete, minLength }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  const id = `recovery-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div><label htmlFor={id} className="font-mono text-[9px] uppercase tracking-[0.13em]">{label}</label><input id={id} required minLength={minLength} maxLength={128} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-2 h-12 w-full border border-black/30 bg-[#f7f6f1] px-3 text-sm text-black outline-none transition-colors focus:border-black focus:bg-white" /></div>;
}
