/** Reads a response body as JSON; an empty or non-JSON body (a platform error page, a dropped connection) becomes `{}`. */
export async function readJson<T extends object>(response: Response): Promise<T & { error?: string }> {
  try {
    return (await response.json()) as T & { error?: string };
  } catch {
    return {} as T & { error?: string };
  }
}

/** Error text for a failed load: the server's own message, or the page name and status code when the body had none. */
export function loadErrorMessage(body: { error?: string }, status: number, page: string) {
  return body.error || `${page} couldn't load (error ${status}). Try again.`;
}
