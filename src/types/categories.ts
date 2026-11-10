import type { ReviewImport } from "./reviews";

export interface Category {
  id: string;
  name: string;
  description: string;
  action: string;
}
export interface ReviewOutcome {
  reviewId: string;
  assignments: { categoryId: string; excerpt: string }[];
  praise: boolean;
  nonActionable: boolean;
}
export interface CategoryTask {
  status: "New" | "Planned" | "Resolved";
  brief: string;
}
export interface Categorisation {
  id: string;
  status: "running" | "paused" | "completed";
  processedCount: number;
  totalCount: number;
  attempts: number;
  error: string | null;
  model: string;
  createdAt: string;
  categories: Category[];
  outcomes: ReviewOutcome[];
  tasks: Record<string, CategoryTask>;
}
export interface CategorisationResult extends Categorisation {
  imported: ReviewImport;
}
