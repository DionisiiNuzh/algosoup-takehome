import { useState } from "react";
import type { Review } from "../../types/reviews";

function reviewDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

/** Paginate an imported sample locally, independently of categorisation state. */
export function ReviewList({
  reviews,
  pageSize = 5,
}: {
  reviews: Review[];
  pageSize?: number;
}) {
  const [selectedPage, setSelectedPage] = useState(1);
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 5;
  const pageCount = Math.max(1, Math.ceil(reviews.length / size));
  const page = Math.min(selectedPage, pageCount);
  const start = (page - 1) * size;
  const visible = reviews.slice(start, start + size);
  const rated = reviews.filter((review) => review.rating !== null);
  const average = rated.length
    ? (
        rated.reduce((sum, review) => sum + review.rating!, 0) / rated.length
      ).toFixed(1)
    : "—";
  return (
    <section className="review-widget" aria-labelledby="imported-reviews-title">
      <div className="review-widget-heading">
        <h3 id="imported-reviews-title">
          Imported reviews <span>({reviews.length})</span>
        </h3>
        <span>
          Average rating: {average}
          {rated.length > 0 ? " / 5" : ""}
        </span>
      </div>
      {reviews.length === 0 ? (
        <p>No written reviews were returned for this app and locale.</p>
      ) : (
        <>
          <div className="imported-review-list">
            {visible.map((review) => (
              <article key={review.reviewId} className="imported-review">
                <div className="imported-review-meta">
                  <strong>{review.authorName || "Google Play reviewer"}</strong>
                  <span>
                    {review.rating === null
                      ? "Unrated"
                      : `${review.rating} / 5 ★`}
                  </span>
                  <time dateTime={review.reviewedAt ?? undefined}>
                    {reviewDate(review.reviewedAt)}
                  </time>
                </div>
                <p className="original-review-text">{review.text}</p>
                <div className="imported-review-footer">
                  <span>
                    {review.helpfulCount ?? 0} helpful votes
                    {review.appVersion
                      ? ` · App version ${review.appVersion}`
                      : ""}
                  </span>
                  {review.sourceUrl && (
                    <a href={review.sourceUrl} target="_blank" rel="noreferrer">
                      View on Google Play ↗
                    </a>
                  )}
                </div>
                {review.developerReply && (
                  <details>
                    <summary>Developer reply</summary>
                    <p className="original-review-text">
                      {review.developerReply.text}
                    </p>
                    <small>{reviewDate(review.developerReply.repliedAt)}</small>
                  </details>
                )}
              </article>
            ))}
          </div>
          <nav className="review-pagination" aria-label="Review pages">
            <span aria-live="polite">
              Showing {start + 1}–{Math.min(start + size, reviews.length)} of{" "}
              {reviews.length} · Page {page} of {pageCount}
            </span>
            <div>
              <button
                className="secondary"
                disabled={page === 1}
                onClick={() => setSelectedPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="secondary"
                disabled={page === pageCount}
                onClick={() => setSelectedPage(page + 1)}
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
