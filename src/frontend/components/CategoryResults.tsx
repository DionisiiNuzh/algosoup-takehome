import { useState } from "react";
import type {
  Category,
  Categorisation,
  CategoryTask,
} from "../../types/categories";
import type { Review } from "../../types/reviews";

function defaultTask(category: Category): CategoryTask {
  return {
    status: "New",
    brief: `${category.name}\n\nReported problem\n${category.description}\n\nSuggested investigation (hypothesis)\n${category.action}\n\nAcceptance criteria\n- Reproduce the reported problem.\n- Verify the affected flow and add a regression check.`,
  };
}
function TaskEditor({
  category,
  saved,
  onSave,
}: {
  category: Category;
  saved?: CategoryTask;
  onSave: (task: CategoryTask) => Promise<void>;
}) {
  const [draft, setDraft] = useState(saved ?? defaultTask(category));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setMessage("Saved to analysis.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="category-task">
      <label htmlFor={`status-${category.id}`}>Task status</label>
      <select
        id={`status-${category.id}`}
        value={draft.status}
        onChange={(e) => {
          setDraft({
            ...draft,
            status: e.target.value as CategoryTask["status"],
          });
          setMessage("Unsaved changes");
        }}
      >
        <option>New</option>
        <option>Planned</option>
        <option>Resolved</option>
      </select>
      <label htmlFor={`brief-${category.id}`}>Editable task brief</label>
      <textarea
        id={`brief-${category.id}`}
        rows={8}
        maxLength={20000}
        value={draft.brief}
        onChange={(e) => {
          setDraft({ ...draft, brief: e.target.value });
          setMessage("Unsaved changes");
        }}
      />
      <div className="modal-footer">
        <button
          className="primary"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save task"}
        </button>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(draft.brief);
              setMessage("Copied.");
            } catch {
              setMessage("Select and copy the brief manually.");
            }
          }}
        >
          Copy brief
        </button>
        <span role="status">{message}</span>
      </div>
    </div>
  );
}
export function CategoryResults({
  analysis,
  reviews,
  onResume,
  onSaveTask,
}: {
  analysis: Categorisation;
  reviews: Review[];
  onResume: () => Promise<void>;
  onSaveTask: (categoryId: string, task: CategoryTask) => Promise<void>;
}) {
  const byId = new Map(reviews.map((r) => [r.reviewId, r]));
  const categories = analysis.categories
    .map((category) => ({
      category,
      evidence: analysis.outcomes.flatMap((outcome) =>
        outcome.assignments
          .filter((a) => a.categoryId === category.id)
          .map((a) => ({ ...a, review: byId.get(outcome.reviewId)! })),
      ),
    }))
    .sort(
      (a, b) =>
        b.evidence.length - a.evidence.length ||
        a.category.name.localeCompare(b.category.name),
    );
  const [filter, setFilter] = useState<"all" | "praise" | "other">("all");
  return (
    <section
      className="categorisation-results"
      aria-labelledby="categories-title"
    >
      <div className="results-heading">
        <h2 id="categories-title">Specific issues</h2>
        <strong>{analysis.categories.length} discovered</strong>
      </div>
      <p role="status">
        {analysis.status === "completed"
          ? "Analysis complete"
          : analysis.status === "paused"
            ? "Analysis paused"
            : "Categorising reviews…"}{" "}
        · {analysis.processedCount} / {analysis.totalCount} reviews processed
      </p>
      <progress
        max={analysis.totalCount || 1}
        value={analysis.processedCount}
        aria-label="Reviews categorised"
      />
      {analysis.error && (
        <p role="alert">
          {analysis.error}
          {analysis.status === "running" && " Retrying…"}
        </p>
      )}
      {analysis.status === "paused" && (
        <button className="primary" onClick={() => void onResume()}>
          Resume analysis
        </button>
      )}
      <div className="category-tabs" role="group" aria-label="Feedback type">
        <button
          aria-pressed={filter === "all"}
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          Issues ({categories.length})
        </button>
        <button
          aria-pressed={filter === "praise"}
          className={filter === "praise" ? "selected" : ""}
          onClick={() => setFilter("praise")}
        >
          Praise ({analysis.outcomes.filter((o) => o.praise).length})
        </button>
        <button
          aria-pressed={filter === "other"}
          className={filter === "other" ? "selected" : ""}
          onClick={() => setFilter("other")}
        >
          Other feedback (
          {analysis.outcomes.filter((o) => o.nonActionable).length})
        </button>
      </div>
      {filter === "all" ? (
        <>
          {!categories.length && (
            <p>
              {analysis.status === "completed"
                ? "No specific actionable issues found in this sample."
                : "Specific issues will appear as reviews are processed."}
            </p>
          )}
          {categories.map(({ category, evidence }) => (
            <article className="category-result" key={category.id}>
              <div className="results-heading">
                <h3>{category.name}</h3>
                <span>
                  {evidence.length} reviews ·{" "}
                  {Math.round((evidence.length / analysis.totalCount) * 100)}%
                  of sample
                </span>
              </div>
              <p>{category.description}</p>
              <p>
                <strong>Suggested investigation (hypothesis): </strong>
                {category.action}
              </p>
              <details>
                <summary>Supporting reviews ({evidence.length})</summary>
                {evidence.map(({ review, excerpt }) => (
                  <div className="evidence-review" key={review.reviewId}>
                    <blockquote>{excerpt}</blockquote>
                    <p className="original-review-text">{review.text}</p>
                    <small>
                      {review.rating === null
                        ? "Unrated"
                        : `${review.rating} / 5 ★`}{" "}
                      ·{" "}
                      {review.reviewedAt
                        ? new Date(review.reviewedAt).toLocaleDateString(
                            "en-GB",
                          )
                        : "Date unavailable"}
                      {review.appVersion
                        ? ` · Version ${review.appVersion}`
                        : ""}
                    </small>
                    {review.sourceUrl && (
                      <a
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Google Play ↗
                      </a>
                    )}
                  </div>
                ))}
              </details>
              <details>
                <summary>
                  Task brief · {analysis.tasks[category.id]?.status ?? "New"}
                </summary>
                <TaskEditor
                  category={category}
                  saved={analysis.tasks[category.id]}
                  onSave={(task) => onSaveTask(category.id, task)}
                />
              </details>
            </article>
          ))}
        </>
      ) : (
        analysis.outcomes
          .filter((o) => (filter === "praise" ? o.praise : o.nonActionable))
          .map((o) => (
            <div key={o.reviewId} className="evidence-review">
              <p className="original-review-text">
                {byId.get(o.reviewId)?.text}
              </p>
            </div>
          ))
      )}
      <p className="sample-footnote">
        Counts reflect this imported sample. One review can support several
        issues and include praise or other feedback. Percentages can total more
        than 100%. Progress and saved tasks persist on the server.
      </p>
    </section>
  );
}
