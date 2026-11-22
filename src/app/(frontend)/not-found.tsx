import Link from "next/link";

import { StatusScene, statusButton, statusButtonGhost } from "@/components/brand/status-scene";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#090909] px-4 py-12 text-[#eceae3] sm:px-6">
      <StatusScene
        code="404"
        label="not found"
        title="This trace stops here."
        body="The page you asked for doesn't exist, has moved, or belongs to a project you can't open."
        broken
        actions={
          <>
            <Link href="/dashboard" className={statusButton}>Go to dashboard</Link>
            <Link href="/" className={statusButtonGhost}>Back home</Link>
          </>
        }
      />
    </main>
  );
}
