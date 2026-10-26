import { redirect } from "next/navigation";

// The Scores page is already the analytics view (trends, spread, who graded), so this route lands there.
export default async function ScoresAnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/scores`);
}
