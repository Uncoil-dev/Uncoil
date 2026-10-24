"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { parseEntryIntent, safeRelativePath } from "@/lib/navigation-context";

export function BetterAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestedPath = searchParams.get("redirect") || searchParams.get("redirect_url");
  const callbackPath = safeRelativePath(requestedPath, mode === "sign-up" ? "/onboarding" : "/dashboard");
  const intent = parseEntryIntent(searchParams.get("intent"));

  // Already signed in (the login cookie lasts 30 days): skip the form and go straight in.
  const { data: session } = authClient.useSession();
  const alreadySignedIn = Boolean(session?.user);
  useEffect(() => {
    if (!alreadySignedIn) return;
    const target = new URL(callbackPath, window.location.origin);
    if (intent) target.searchParams.set("intent", intent);
    window.location.replace(`${target.pathname}${target.search}${target.hash}`);
  }, [alreadySignedIn, callbackPath, intent]);

  function absolute(path: string) {
    return new URL(path, window.location.origin).toString();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: absolute(callbackPath) })
        : await authClient.signIn.email({ email: email.trim(), password, callbackURL: absolute(callbackPath) });
      if (result.error) return setError(result.error.message || "Authentication failed.");
      const callback = new URL(callbackPath, window.location.origin);
      if (intent) callback.searchParams.set("intent", intent);
      window.location.assign(`/auth/callback?redirect_url=${encodeURIComponent(`${callback.pathname}${callback.search}${callback.hash}`)}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  async function continueWith(provider: "google" | "github") {
    setPending(true);
    setError("");
    // Give the Better Auth/Convex clients a chance to observe the OAuth
    // session before protected destinations such as billing are rendered.
    const authCallbackPath = `/auth/callback?redirect_url=${encodeURIComponent(callbackPath)}`;
    const result = await authClient.signIn.social({
      provider,
      callbackURL: absolute(authCallbackPath),
      errorCallbackURL: absolute("/auth/error"),
      newUserCallbackURL: absolute(authCallbackPath),
    });
    if (result.error) {
      setPending(false);
      setError(result.error.message || `${provider === "github" ? "GitHub" : "Google"} sign-in failed.`);
    }
  }

  if (alreadySignedIn) return null;

  return (
    <div>
      <h2 className="font-pixel text-4xl leading-none tracking-[-0.06em]">{mode === "sign-up" ? "Start debugging agents." : "Welcome back."}</h2>
      <p className="mt-3 text-sm leading-6 text-black/55">{mode === "sign-up" ? "Free to start. Your first trace takes about five minutes." : "Your traces are right where you left them."}</p>

      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        <SocialButton label="GitHub" disabled={pending} onClick={() => void continueWith("github")} icon={<GitHubMark />} />
        <SocialButton label="Google" disabled={pending} onClick={() => void continueWith("google")} icon={<GoogleMark />} />
      </div>

      <div className="my-6 flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.15em] text-black/55"><span className="h-px flex-1 bg-black/20" />or continue with email<span className="h-px flex-1 bg-black/20" /></div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "sign-up" ? <Field label="Full name" value={name} onChange={setName} autoComplete="name" /> : null}
        <Field label="Email address" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="auth-password" className="font-mono text-[9px] uppercase tracking-[0.13em]">Password</label>
            {mode === "sign-in" ? <Link href="/forgot-password" className="font-mono text-[9px] uppercase tracking-[0.1em] text-black/55 underline underline-offset-4 hover:text-black">Forgot password?</Link> : null}
          </div>
          <div className="relative mt-2">
            <input id="auth-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} className="h-12 w-full border border-black/30 bg-[#f7f6f1] px-3 pr-12 text-sm text-black outline-none transition-colors focus:border-black focus:bg-white" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="active-press absolute inset-y-0 right-0 flex w-12 items-center justify-center text-black/55 hover:text-black" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
          {mode === "sign-up" ? <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-black/55">8–128 characters</p> : null}
        </div>

        {error ? <p role="alert" aria-live="polite" className="border border-black bg-[#f4d44d] p-3 text-xs leading-5 text-black">{error}</p> : null}

        <button className="active-press flex h-12 w-full items-center justify-between bg-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white transition-colors hover:bg-[#f4d44d] hover:text-black disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || !email.trim() || password.length < 8 || (mode === "sign-up" && !name.trim())}>
          <span>{pending ? "Connecting…" : mode === "sign-up" ? "Create account" : "Sign in"}</span><ArrowRight className="size-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-black/55">
        {mode === "sign-up" ? "Already have an account? " : "New to tracify? "}
        <Link className="font-medium text-black underline underline-offset-4" href={`${mode === "sign-up" ? "/sign-in" : "/sign-up"}?redirect_url=${encodeURIComponent(callbackPath)}`}>{mode === "sign-up" ? "Sign in" : "Create one"}</Link>
      </p>
      {mode === "sign-up" ? <p className="mt-4 text-center text-[10px] leading-5 text-black/55">By continuing, you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.</p> : null}
    </div>
  );
}

function SocialButton({ label, icon, disabled, onClick }: { label: string; icon: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="active-press flex h-12 items-center justify-center gap-3 border border-black/30 bg-white font-mono text-[9px] uppercase tracking-[0.12em] transition-colors hover:border-black hover:bg-[#f4d44d] disabled:opacity-50">{icon} Continue with {label}</button>;
}

function GoogleMark() {
  return <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="currentColor" opacity=".72" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="currentColor" opacity=".5" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.2 1.04 4.55l3.35-2.62Z"/><path fill="currentColor" opacity=".86" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

function GitHubMark() {
  return <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.02-1.9-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.96c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.89 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" /></svg>;
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string }) {
  const id = `auth-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div><label htmlFor={id} className="font-mono text-[9px] uppercase tracking-[0.13em]">{label}</label><input id={id} required value={value} onChange={(event) => onChange(event.target.value)} type={type} autoComplete={autoComplete} className="mt-2 h-12 w-full border border-black/30 bg-[#f7f6f1] px-3 text-sm text-black outline-none transition-colors focus:border-black focus:bg-white" /></div>;
}
