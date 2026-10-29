import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { PromptManagement } from "@/components/dashboard/prompt-management";
export default async function NewPromptPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <div><DashboardTopbar title="Create prompt" description="Create and version a prompt for your Uncoil workflows." /><div className="p-6"><PromptManagement projectId={projectId} /></div></div>; }
