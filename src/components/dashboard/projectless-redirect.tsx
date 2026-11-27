"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/components/brand/brand-loader";

const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";

/** Where a dashboard page opened without a project should go: that page of the last project, or the picker. */
export function projectlessHref(page: string, storage: Pick<Storage, "getItem">) {
  const projectId = storage.getItem(LAST_PROJECT_STORAGE_KEY);
  if (!projectId || projectId === "no-project") return "/dashboard";
  const base = `/dashboard/${encodeURIComponent(projectId)}`;
  return page ? `${base}/${page}` : base;
}

/** Pages under /dashboard need a project id; send visitors to one instead of rendering an empty page. */
export function ProjectlessRedirect({ page }: { page: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(projectlessHref(page, window.localStorage));
  }, [page, router]);
  return <BrandLoader label="Opening your project" />;
}
