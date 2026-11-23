import { NextRequest, NextResponse } from "next/server";
import { getFailOpenRate } from "@/lib/tinybird";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  const days = Number(req.nextUrl.searchParams.get("days")) || 7;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const result = await getFailOpenRate(projectId, days);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Fail-open rate query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
