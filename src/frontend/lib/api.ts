import type { ReviewImport } from "../types";
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
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Review import failed (${response.status}). Please try again.`,
    );
  }
  if (
    !body ||
    !Array.isArray(body.reviews) ||
    typeof body.appId !== "string" ||
    typeof body.fetchedCount !== "number"
  ) {
    throw new Error(
      "The server returned an invalid review response. Please try again.",
    );
  }
  return body as ReviewImport;
}
