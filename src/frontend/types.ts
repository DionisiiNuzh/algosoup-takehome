export type TaskStatus = "New" | "Planned" | "Resolved";
export interface Task {
  status: TaskStatus;
  brief: string;
}
export interface Issue {
  id: string;
  title: string;
  category: string;
  color: string;
  ratio: number;
  summary: string;
  action: string;
  reviews: [string, number, string][];
}
export interface Analysis {
  url: string;
  app: string;
  count: number;
  tasks: Record<string, Task>;
}
export interface SavedState {
  history: Analysis[];
  selectedUrl: string | null;
}
export type AnalysisPhase = "idle" | "loading" | "success" | "error";
export interface Review {
  reviewId: string;
  appId: string;
  text: string;
  rating: number | null;
  reviewedAt: string | null;
  sourceUrl: string | null;
}
export interface ReviewImport {
  appId: string;
  language: string;
  country: string;
  requestedCount: number;
  fetchedCount: number;
  fetchedAt: string;
  reviews: Review[];
}
