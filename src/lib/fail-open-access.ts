import { getWrongRegionApiKeyResponse, isUncoilApiKey } from "@/lib/api-keys";

type FailOpenAccessDeps = {
  /** Returns the id of the project the API key belongs to, or null when no project has it. */
  projectIdForKey: (apiKey: string) => Promise<string | null>;
  /** Session check used when the caller sends no API key (the dashboard). */
  denySession: () => Promise<Response | null>;
};

/**
 * Access check for the fail-open rate route. Returns an error response, or null when the caller may
 * read `projectId`: either its API key belongs to that project, or it sent no key and its session can
 * read the project.
 */
export async function denyFailOpenAccess(
  authorization: string | null,
  projectId: string,
  deps: FailOpenAccessDeps,
): Promise<Response | null> {
  if (!authorization) return deps.denySession();

  const apiKey = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!isUncoilApiKey(apiKey)) return Response.json({ error: "Invalid API key" }, { status: 401 });
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return wrongRegion;

  const ownerId = await deps.projectIdForKey(apiKey);
  if (!ownerId) return Response.json({ error: "Invalid API key" }, { status: 401 });
  // A key for another project gets the same answer as a missing project, so ids cannot be probed.
  if (ownerId !== projectId) return Response.json({ error: "Project not found" }, { status: 404 });
  return null;
}
