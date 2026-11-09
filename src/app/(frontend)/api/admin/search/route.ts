import { NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";
import { getBingReport, getGoogleReport } from "@/lib/search-integrations";

export const dynamic = "force-dynamic";

/** Admin only. Same backend rule as the admin page. Anyone else gets a plain 404. */
export async function GET() {
  const access = await fetchAuthQuery(api.admin.access, {}).catch(() => null);
  if (!access?.allowed) return new NextResponse(null, { status: 404 });
  const [google, bing] = await Promise.all([getGoogleReport(), getBingReport()]);
  return NextResponse.json({ google, bing }, { headers: { "cache-control": "private, no-store" } });
}
