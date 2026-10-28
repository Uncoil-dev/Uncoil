import { UNCOIL_REGIONS } from "@/lib/regions";

const cloud = UNCOIL_REGIONS.eu.origin;

// Pages people reach from the marketing site's Sign in / Start building / Playground buttons.
// The cloud host is a different origin, so without this the first click pays for DNS, TLS and
// the page itself. Chrome's speculation rules load these ahead of time (same-site, so cookies
// and sign-in carry over); other browsers still get the early connection from the preconnect.
const rules = {
  prerender: [{ source: "list", urls: [`${cloud}/cloud/mode?intent=build`], eagerness: "eager" }],
  prefetch: [{ source: "list", urls: [`${cloud}/sign-in`, `${cloud}/sign-up`, `${cloud}/demo/project`], eagerness: "eager" }],
};

export function CloudPrewarm() {
  return (
    <>
      <link rel="preconnect" href={cloud} />
      <link rel="dns-prefetch" href={cloud} />
      <script type="speculationrules" dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }} />
    </>
  );
}
