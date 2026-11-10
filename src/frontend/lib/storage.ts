import type { Analysis, SavedState, Task } from "../types";
const key = "reviewroom-live-v1";
function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<Analysis>;
  return (
    typeof a.url === "string" &&
    typeof a.app === "string" &&
    typeof a.count === "number" &&
    !!a.imported &&
    Array.isArray(a.imported.reviews) &&
    a.imported.reviews.every(
      (review) =>
        typeof review.reviewId === "string" && typeof review.text === "string",
    )
  );
}
function normalize(a: Analysis): Analysis {
  const tasks: Record<string, Task> = {};
  for (const [id, task] of Object.entries(a.tasks || {})) {
    if (
      task &&
      ["New", "Planned", "Resolved"].includes(task.status) &&
      typeof task.brief === "string"
    )
      tasks[id] = task;
  }
  return { ...a, tasks };
}
export function loadState(): SavedState {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const history: Analysis[] = Array.isArray(saved.history)
      ? saved.history.filter(isAnalysis).map(normalize)
      : [];
    // Restore only live imports; demo data uses a separate storage key.
    if (isAnalysis(saved) && !history.some((a) => a.url === saved.url))
      history.push(normalize(saved));
    const selectedUrl =
      saved.selectedUrl !== undefined
        ? saved.selectedUrl
        : saved.count
          ? saved.url
          : null;
    return {
      history,
      selectedUrl: typeof selectedUrl === "string" ? selectedUrl : null,
    };
  } catch {
    return { history: [], selectedUrl: null };
  }
}
export function saveState(state: SavedState): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
