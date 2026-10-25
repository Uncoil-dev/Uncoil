"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeRelativePath } from "@/lib/navigation-context";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";
import { getAuthCallbackAction } from "@/lib/auth-callback-state";

function safeRedirect(value: string | null) {
  return safeRelativePath(value, "/dashboard");
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const convexAuth = useConvexAuthReadiness();
  const redirectPath = safeRedirect(searchParams.get("redirect_url"));
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 15_000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const action = getAuthCallbackAction({
      sessionPending: isPending,
      hasSession: Boolean(session),
      convexStatus: convexAuth.status,
    });

    // Better Auth owns the browser session. Convex can briefly report an
    // unauthenticated state while its JWT exchange catches up after OAuth.
    // Redirecting on that transient state sends a valid session back through
    // sign-in and creates the loop this page is meant to prevent.
    if (action === "sign-in") {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (action === "continue") {
      // Every sign-up lands here, email or Google or GitHub. The server decides whether this account is new and not yet welcomed.
      try {
        if (!window.sessionStorage.getItem("tracify.welcome.checked")) {
          void fetch("/api/lifecycle/welcome", { method: "POST", keepalive: true })
            .then((response) => { if (response.ok) window.sessionStorage.setItem("tracify.welcome.checked", "1"); })
            .catch(() => undefined);
        }
      } catch { /* storage can be blocked; the server still sends at most once */ }
      router.replace(redirectPath);
    }
  }, [convexAuth.status, isPending, redirectPath, router, session]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#eceae3] px-5 text-black">
      {timedOut || convexAuth.status === "error" ? <ConvexAuthState mode="error" redirectPath={redirectPath} /> : <p className="font-mono text-[10px] uppercase tracking-[0.14em]">Finishing sign-in…</p>}
    </main>
  );
}
