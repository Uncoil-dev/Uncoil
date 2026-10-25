"use client";

import { useEffect } from "react";

import { reportBrowserCrash } from "@/lib/report-browser-crash";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportBrowserCrash(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#eceae3", color: "#090909", fontFamily: "ui-monospace, monospace", padding: "4rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem" }}>Something went wrong.</h1>
        <p>That one&apos;s on us. We&apos;ve been told.</p>
        <button type="button" onClick={() => reset()} style={{ background: "#090909", color: "#eceae3", border: 0, padding: "0.75rem 1.25rem" }}>Try again</button>
      </body>
    </html>
  );
}
