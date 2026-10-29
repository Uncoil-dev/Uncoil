import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/reading/legal-document";

export const metadata = pageMetadata({ title: "Terms of service", description: "The terms that apply when you use the Uncoil AI agent observability platform, its SDKs, and its APIs.", path: "/terms" });

const clauses = [
  { id: "acceptance", title: "Acceptance", body: "By accessing or using Uncoil, you agree to these Terms of Service and applicable laws. If you do not agree, you may not use the service." },
  { id: "use-license", title: "Use license", body: "You may use the platform for agent observability. You may not reverse engineer the service, remove proprietary notices, violate applicable law, or exceed the limits of your plan." },
  { id: "disclaimer", title: "Disclaimer", body: "Uncoil is provided on an 'as is' basis without implied warranties of merchantability, fitness for a particular purpose, or non-infringement." },
  { id: "limitations", title: "Limitations", body: "To the extent permitted by law, Uncoil and its suppliers are not liable for indirect damages, loss of data, profit, or business interruption arising from use of the service." },
  { id: "governing-law", title: "Governing law", body: "These terms are governed by the laws of the jurisdiction in which Uncoil operates, subject to the courts with applicable jurisdiction." },
] as const;

export default function TermsPage() {
  return (
    <LegalDocument
      current="/terms"
      eyebrow="Terms of service"
      title="The rules of the relationship."
      description="The ground rules for using Uncoil, written to be read."
      updated="16 May 2026"
      summary="Use Uncoil to observe your agents, stay within your plan and the law, and know the service is provided as it is."
      highlights={[
        { label: "Use", title: "Observe your agents.", body: "Use Uncoil within your plan and the law." },
        { label: "No reverse engineering", title: "Keep the notices.", body: "Do not reverse engineer the service or remove proprietary notices." },
        { label: "As is", title: "Provided as it is.", body: "No implied warranties, with liability limited as the law permits." },
      ]}
      sections={clauses}
    />
  );
}
