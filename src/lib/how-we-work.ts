import { plans } from "./pricing-plans.ts";
import { BACKUP_DAYS } from "./data-locations.ts";
import { PLAN_RETENTION_DAYS } from "./retention.ts";

/** One plain statement and the page that backs it up. */
export type Statement = { text: string; proof: { label: string; href: string } };

const price = plans.map((p) => `${p.name} is $${p.monthly}${p.monthly === 0 ? "" : " a month"}.`).join(" ");
const keep = plans.map((p) => `${PLAN_RETENTION_DAYS[p.id]} days on ${p.name}`).join(", ");

export const sections: readonly { title: string; items: readonly Statement[] }[] = [
  {
    title: "Pricing",
    items: [
      { text: `Prices are public. ${price}`, proof: { label: "Pricing", href: "/pricing" } },
      { text: "You buy Free, Pro and Team yourself on the pricing page. No call is needed.", proof: { label: "Pricing", href: "/pricing" } },
      { text: "Enterprise is arranged by email.", proof: { label: "Contact", href: "/contact" } },
    ],
  },
  {
    title: "Code and license",
    items: [
      { text: "The code is public on GitHub and licensed MIT.", proof: { label: "Source code", href: "https://github.com/Uncoil-dev/Uncoil" } },
    ],
  },
  {
    title: "Where data is stored",
    items: [
      { text: "In the EU region, account data is in Ireland. Traces are on a server we run in Frankfurt, Germany.", proof: { label: "Security: data locations", href: "/security#data" } },
      { text: "Queued span events pass through a queue in the United States. So we do not claim end-to-end EU residency.", proof: { label: "Security: data locations", href: "/security#data" } },
      { text: "You pick a region and the matching SDK endpoint.", proof: { label: "Docs: data regions", href: "/docs/data-regions" } },
    ],
  },
  {
    title: "Export and deletion",
    items: [
      { text: "You can download one JSON file with a project's traces, scores, alerts, comments, prompts and datasets.", proof: { label: "Security: your data", href: "/security#deletion" } },
      { text: "You can delete a project yourself. Its traces and records are removed and its API key stops working.", proof: { label: "Security: your data", href: "/security#deletion" } },
      { text: `Backups are not kept past ${BACKUP_DAYS} days. For a whole account, email privacy@uncoil.dev.`, proof: { label: "Security: your data", href: "/security#deletion" } },
    ],
  },
  {
    title: "Support",
    items: [
      { text: "Support is by email. The contact page lists which inbox to use.", proof: { label: "Contact", href: "/contact" } },
      { text: "Live service status is public.", proof: { label: "Status", href: "/status" } },
      { text: "The privacy policy and terms are public.", proof: { label: "Privacy", href: "/privacy" } },
    ],
  },
];

export const notDoing: readonly Statement[] = [
  { text: `Uncoil does not keep traces past your plan's retention: ${keep}.`, proof: { label: "Pricing", href: "/pricing" } },
  { text: "Uncoil does not store your project API keys in plain text. It keeps a hash.", proof: { label: "Security", href: "/security" } },
  { text: "Uncoil does not include API keys, billing details or webhook addresses in a data download.", proof: { label: "Security: your data", href: "/security#deletion" } },
  { text: "Uncoil does not block your production traffic when a cost ceiling is reached. Ceilings fail open.", proof: { label: "Security", href: "/security" } },
  { text: "Uncoil does not claim end-to-end EU residency.", proof: { label: "Security: data locations", href: "/security#data" } },
];
