"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";
import { isGoogleAnalyticsMeasurementId } from "@/lib/google-analytics";

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Consent is browser-owned state, so read it after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(readConsent().analytics);

    const handleConsent = (event: Event) => {
      const analytics = (event as CustomEvent<{ analytics: boolean }>).detail.analytics;
      window.gtag?.("consent", "update", {
        analytics_storage: analytics ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      setEnabled(analytics);
    };

    window.addEventListener(CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_EVENT, handleConsent);
  }, []);

  if (!enabled || !isGoogleAnalyticsMeasurementId(measurementId)) return null;

  return (
    <>
      <Script
        id="uncoil-google-analytics-source"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="uncoil-google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('config', '${measurementId}', { send_page_view: true });`}
      </Script>
    </>
  );
}
