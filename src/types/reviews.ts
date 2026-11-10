/** A review's original evidence, normalized from Google Play. */
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  reviewId: string;
  appId: string;
  authorName: string | null;
  text: string;
  rating: ReviewRating | null;
  /** ISO 8601 source timestamp; not necessarily the original creation date. */
  reviewedAt: string | null;
  helpfulCount: number | null;
  appVersion: string | null;
  sourceUrl: string | null;
  developerReply: { text: string; repliedAt: string | null } | null;
}

/** Untrusted API fields are validated before sending a request upstream. */
export interface FetchReviewsInput {
  app: unknown;
  count?: unknown;
}

export interface ReviewImport {
  appId: string;
  language: 'en';
  country: 'gb';
  sort: 'newest';
  requestedCount: number;
  fetchedCount: number;
  fetchedAt: string;
  reviews: Review[];
}
