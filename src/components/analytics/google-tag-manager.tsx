"use client";

import Script from "next/script";

const containerId = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "GTM-TQS6MZ2P";

/**
 * Loads the Uncoil GTM container. GA4 is configured inside GTM so the site
 * has one analytics delivery path and cannot double-count page views.
 */
export function GoogleTagManager() {
  return (
    <Script id="uncoil-google-tag-manager" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`}
    </Script>
  );
}
