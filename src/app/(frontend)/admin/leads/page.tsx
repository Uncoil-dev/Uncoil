import type { Metadata } from "next";
import { requireLibraryAccess } from "@/lib/library-access";
import { LeadInbox } from "@/components/admin/lead-inbox";
export const metadata: Metadata = { title: "Lead inbox — Uncoil", robots: { index: false, follow: false } };
export default async function AdminLeadsPage() { await requireLibraryAccess("/admin/leads"); return <main className="min-h-screen bg-[#eceae3] px-6 pb-20 pt-28 text-black"><div className="mx-auto max-w-6xl"><p className="font-mono text-[10px] uppercase tracking-widest text-black/55">Private operations</p><h1 className="mt-5 font-pixel text-6xl leading-none tracking-[-0.06em]">Lead inbox</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-black/60">Every request in one place, with a clear next action and no CRM maze.</p><div className="mt-10"><LeadInbox /></div></div></main>; }
