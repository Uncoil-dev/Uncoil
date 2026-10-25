"use client";

import { useEffect } from "react";
import Link from "next/link";

import { reportBrowserCrash } from "@/lib/report-browser-crash";
import { StatusScene, statusButton, statusButtonGhost } from "@/components/brand/status-scene";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route error", error);
    reportBrowserCrash(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#eceae3] px-4 py-12 text-black sm:px-6" role="alert">
      <StatusScene
        code="500"
        label="error"
        title="Something went wrong."
        body="That one's on us. Try again, and if it keeps happening, head back home."
        broken
        detail={error.digest ? <p className="font-mono text-[11px] text-[#eceae3]/45">ref {error.digest}</p> : null}
        actions={
          <>
            <button type="button" onClick={() => reset()} className={statusButton}>Try again</button>
            <Link href="/" className={statusButtonGhost}>Back home</Link>
          </>
        }
      />
    </main>
  );
}
