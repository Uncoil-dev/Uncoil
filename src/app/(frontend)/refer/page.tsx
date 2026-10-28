import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { CreamBand, Eyebrow, SectionTitle } from "@/components/marketing/company/blocks";
import { ReferralLinkBuilder } from "@/components/marketing/referral-link-builder";

export const metadata = pageMetadata({
  title: "Share Uncoil",
  description: "Make your own Uncoil link to share with a teammate or a friend who runs AI agents.",
  path: "/refer",
});

export default function ReferPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader eyebrow="Share Uncoil" title="Know someone running agents?" lede="Make a link with your name on it. When someone joins the newsletter or writes to us through it, we can see who sent them." />
      <CreamBand>
        <Eyebrow dark={false}>Takes ten seconds</Eyebrow>
        <SectionTitle>Make your link.</SectionTitle>
        <div className="mt-12 max-w-2xl"><ReferralLinkBuilder /></div>
      </CreamBand>
    </div>
  );
}
