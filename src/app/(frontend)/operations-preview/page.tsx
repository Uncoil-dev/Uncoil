import { notFound } from "next/navigation";
import { UncoilOperationsPreview } from "@/components/dashboard/uncoil-operations-preview";

export default function OperationsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UncoilOperationsPreview />;
}
