"use client";

import { useEffect } from "react";
import Link from "next/link";

import { reportBrowserCrash } from "@/lib/report-browser-crash";
import { StatusScene, statusButton, statusButtonGhost } from "@/components/brand/status-scene";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard route error", error);
    reportBrowserCrash(error);
  }, [error]);

  return (
    <div className="flex justify-center px-4 py-10 sm:px-6" role="alert">
      <StatusScene
        compact
        code="500"
        label="dashboard"
        title="This view couldn't load."
        body="Something broke while loading your workspace. Try again, or go back to your projects."
        broken
        detail={error.digest ? <p className="font-mono text-[11px] text-[#eceae3]/45">ref {error.digest}</p> : null}
        actions={
          <>
            <button type="button" onClick={() => reset()} className={statusButton}>Try again</button>
            <Link href="/dashboard" className={statusButtonGhost}>Back to projects</Link>
          </>
        }
      />
    </div>
  );
}
