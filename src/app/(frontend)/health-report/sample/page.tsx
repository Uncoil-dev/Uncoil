import { pageMetadata } from "@/lib/seo";
import { ReportView } from "@/components/health-report/report-view";
import { BuyButton } from "@/components/health-report/buy-button";
import { buildHealthReport, HEALTH_REPORT_PRICE_USD } from "@/lib/health-report";
import { sampleSpans } from "@/lib/health-report-sample";

export const metadata = pageMetadata({
  title: "Sample agent health report",
  description: "A real-looking agent health report built from made-up data: cost, errors, slow steps and ranked fixes. See what you get before you buy.",
  path: "/health-report/sample",
});

const sample = buildHealthReport(sampleSpans(), { now: new Date("2026-11-16T00:00:00Z") });

export default function SampleReportPage() {
  return (
    <>
      <ReportView report={sample} sample />
      <section className="bg-[#090909] px-5 py-14 text-center text-[#eceae3]">
        <h2 className="font-pixel text-3xl tracking-[-0.06em] md:text-4xl">Get this for your own agents.</h2>
        <div className="mt-6 flex justify-center"><BuyButton label={`Get my report · $${HEALTH_REPORT_PRICE_USD}`} /></div>
      </section>
    </>
  );
}
