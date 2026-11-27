import { ProjectlessRedirect } from "@/components/dashboard/projectless-redirect";

// No project version of this page exists, so open the project home.
export default function Page() {
  return <ProjectlessRedirect page="" />;
}
