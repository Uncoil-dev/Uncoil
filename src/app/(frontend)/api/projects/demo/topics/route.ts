import { NextRequest, NextResponse } from "next/server";
import { demoFilter, demoTopics } from "@/lib/demo/demo-queries";
import { parseTraceFilters } from "@/lib/trace-filters";

// The public demo project: answers from the generated sample data and never reads a database.
export async function GET(request: NextRequest) {
  return NextResponse.json(demoTopics(demoFilter(parseTraceFilters(request.nextUrl.searchParams))));
}
