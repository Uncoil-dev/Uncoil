import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/reading/legal-document";

export const metadata = pageMetadata({ title: "Cookie policy", description: "How Uncoil uses necessary storage and optional analytics, and how to change your cookie preferences at any time.", path: "/cookie-policy" });

const sections = [
  { id: "overview", title: "What we store", body: "Uncoil uses a small amount of necessary storage for authentication, security, and core application behavior. We use optional analytics to understand whether onboarding and product workflows are useful." },
  { id: "choices", title: "Your choices", body: "Analytics is enabled by default, but you can turn it off at any time using the privacy preferences control. Turning analytics off does not affect signup, trace ingestion, dashboards, or support." },
  { id: "analytics", title: "Analytics providers", body: "When analytics is enabled, Uncoil uses Google Analytics 4, provided by Google LLC, to measure page views and understand site usage. Advertising storage and ad personalization remain disabled. Google Analytics is not loaded when analytics is rejected before page load, and withdrawing consent sends a denied analytics-storage signal." },
  { id: "necessary", title: "Necessary storage", body: "Authentication sessions, security controls, and saved application state may be required for Uncoil to work. These cannot be disabled through the optional consent controls." },
] as const;

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      current="/cookie-policy"
      eyebrow="Cookie policy"
      title="Small storage. Your call."
      description="What Uncoil keeps in your browser, and what you can switch off."
      updated="16 May 2026"
      summary="We keep only what login and security need. Analytics is optional and you can turn it off whenever you like without losing anything."
      highlights={[
        { label: "Necessary", title: "Login and security.", body: "A small amount of storage keeps you signed in and the app working." },
        { label: "Optional", title: "Analytics you can turn off.", body: "Google Analytics 4 measures page views, and only while analytics is enabled." },
        { label: "Never", title: "No ad tracking.", body: "Advertising storage and ad personalization stay disabled." },
      ]}
      sections={sections}
      contact={{ label: "More detail", title: "Read how we handle data overall.", href: "/privacy", action: "Privacy policy" }}
    />
  );
}
