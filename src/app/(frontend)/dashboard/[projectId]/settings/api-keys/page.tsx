import { redirect } from "next/navigation";
export default async function SettingsApiKeysPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; redirect(`/dashboard/${projectId}/api-keys`); }
