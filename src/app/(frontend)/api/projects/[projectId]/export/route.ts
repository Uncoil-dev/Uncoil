import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { isAuthenticated } from "@/lib/auth-server";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { exportAnalyticsPage } from "@/lib/tinybird";

export const maxDuration = 300;

/** Downloads everything stored for a project as one JSON file. Project admins only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convex = await getAuthedConvexClient();
  const id = projectId as Id<"projects">;

  let project;
  let tables: string[];
  try {
    project = await convex.query(api.projectData.exportProject, { projectId: id });
    tables = await convex.query(api.projectData.exportTables, {});
  } catch {
    return NextResponse.json({ error: "Only project admins can export project data." }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        write(`{"exportedAt":${JSON.stringify(new Date().toISOString())},"project":${JSON.stringify(project)},"data":{`);
        for (const [tableIndex, table] of tables.entries()) {
          write(`${tableIndex ? "," : ""}${JSON.stringify(table)}:[`);
          let cursor: string | null = null;
          let first = true;
          for (;;) {
            const page: { rows: unknown[]; isDone: boolean; cursor: string } = await convex.query(api.projectData.exportPage, { projectId: id, table, cursor });
            for (const row of page.rows) {
              write(`${first ? "" : ","}${JSON.stringify(row)}`);
              first = false;
            }
            if (page.isDone) break;
            cursor = page.cursor;
          }
          write("]");
        }
        write("},\"analytics\":{");
        for (const [tableIndex, table] of (["spans", "evaluation_scores"] as const).entries()) {
          write(`${tableIndex ? "," : ""}${JSON.stringify(table)}:[`);
          let offset = 0;
          for (;;) {
            let rows: Record<string, unknown>[] = [];
            try {
              rows = await exportAnalyticsPage(table, projectId, offset);
            } catch {
              write("]");
              write(`,${JSON.stringify(`${table}_error`)}:"Analytics storage could not be read; this file is incomplete."`);
              rows = [];
              break;
            }
            if (!rows.length) { write("]"); break; }
            write(`${offset ? "," : ""}${rows.map((row) => JSON.stringify(row)).join(",")}`);
            offset += rows.length;
          }
        }
        write("}}");
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const name = String(project.name ?? "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="uncoil-${name}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
