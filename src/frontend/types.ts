import type { ReviewImport } from "../types/reviews";
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
  imported: ReviewImport;
  categorisation?: import("../types/categories").Categorisation;
}
export interface SavedState {
  history: Analysis[];
  selectedUrl: string | null;
}
export type AnalysisPhase = "idle" | "loading" | "success" | "error";
export type { Review, ReviewImport } from "../types/reviews";
