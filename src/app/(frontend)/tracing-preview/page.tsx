import { notFound } from "next/navigation";
import { UncoilTracingPreview } from "@/components/dashboard/uncoil-tracing-preview";

export default function TracingPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UncoilTracingPreview />;
}
