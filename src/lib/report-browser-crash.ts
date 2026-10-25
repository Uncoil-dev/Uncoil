export function reportBrowserCrash(error: Error & { digest?: string }) {
  try {
    const body = JSON.stringify({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      route: window.location.pathname,
    });
    if (!navigator.sendBeacon?.("/api/crash", body)) {
      void fetch("/api/crash", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reporting must never break the error screen.
  }
}
