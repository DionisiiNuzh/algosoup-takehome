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

import type {
  CategorisationResult,
  CategoryTask,
} from "../../types/categories";
async function analysisRequest(
  path: string,
  init?: RequestInit,
): Promise<CategorisationResult> {
  const response = await fetch(`/api/analyses${path}`, init);
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Analysis request failed. Please try again.",
    );
  return body as CategorisationResult;
}
export function startAnalysis(
  app: string,
  count: number,
  signal?: AbortSignal,
) {
  return analysisRequest("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app, count }),
    signal,
  });
}
export function getAnalysis(id: string, signal?: AbortSignal) {
  return analysisRequest(`/${id}`, { signal, cache: "no-store" });
}
export function resumeAnalysis(id: string) {
  return analysisRequest(`/${id}/resume`, { method: "POST" });
}
export async function saveCategoryTask(
  id: string,
  categoryId: string,
  task: CategoryTask,
): Promise<void> {
  const response = await fetch(`/api/analyses/${id}/tasks/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok)
    throw new Error("Could not save the task. Please try again.");
}
