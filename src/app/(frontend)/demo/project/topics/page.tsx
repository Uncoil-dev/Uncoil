import { TopicsExplorer } from "@/components/dashboard/topics/topics-explorer";
import { DEMO_PROJECT_ID } from "@/lib/demo/demo-config";

export default function DemoTopicsPage() {
  return <TopicsExplorer projectId={DEMO_PROJECT_ID} />;
}
