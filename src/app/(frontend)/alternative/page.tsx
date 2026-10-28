import { NavigationSystemExplorations } from "@/components/marketing/navigation-system-explorations";

export const metadata = {
  title: "Uncoil — Future 19 homepage preview",
  description:
    "A complete Uncoil homepage composed from the Future 19 visual system.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function AlternativeHomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eceae3] pt-[54px] text-black">
      <main>
        <NavigationSystemExplorations
          showIntroduction={false}
          showSectionLabels={false}
          showFooter={false}
        />
      </main>
    </div>
  );
}
