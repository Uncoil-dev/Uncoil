import { NextRequest } from "next/server";

import { consumeRateLimit } from "@/lib/redis-cache";
import { reportCrash } from "@/lib/crash-report";

// Browser error boundaries post here so a broken page reaches us before a customer does.
export async function POST(request: NextRequest) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > 8_000) return new Response(null, { status: 204 });
  let body: { message?: unknown; stack?: unknown; route?: unknown; digest?: unknown };
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 204 }); }
  if (typeof body.message !== "string" || !body.message) return new Response(null, { status: 204 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const limit = await consumeRateLimit(`crash-intake:${ip}`, 1, 10, 60);
    if (!limit.allowed) return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }

  await reportCrash({
    source: "browser",
    message: body.message,
    stack: typeof body.stack === "string" ? body.stack : undefined,
    route: typeof body.route === "string" ? body.route : undefined,
    digest: typeof body.digest === "string" ? body.digest : undefined,
  });
  return new Response(null, { status: 204 });
}
