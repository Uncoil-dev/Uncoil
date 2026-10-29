import type { Metadata } from "next";
import { api } from "convex/_generated/api";
import { notFound, redirect } from "next/navigation";
import { fetchAuthQuery } from "@/lib/auth-server";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = { title: "Admin — Uncoil", robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Same rule the backend enforces for the data, so the page, the menu link and the numbers always agree.
  const access = await fetchAuthQuery(api.admin.access, {}).catch(() => null);
  if (!access?.authenticated) redirect(`/sign-in?redirect=${encodeURIComponent("/admin")}`);
  if (!access.allowed) notFound();
  return <AdminOverview />;
}
