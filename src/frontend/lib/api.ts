import type { ReviewImport } from "../types";
// Ready for the live-import workflow. The demo does not call this endpoint.
export async function importReviews(
  app: string,
  count: number,
  signal?: AbortSignal,
): Promise<ReviewImport> {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app, count }),
    signal,
  });
  if (!response.ok)
    throw new Error(`Review import failed (${response.status})`);
  return response.json();
}
