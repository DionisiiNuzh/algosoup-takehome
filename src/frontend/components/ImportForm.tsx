import { useEffect, useState } from "react";
import type { Analysis } from "../types";
export function ImportForm({
  current,
  busy,
  error,
  onAnalyze,
}: {
  current: Analysis | null;
  busy: boolean;
  error: string;
  onAnalyze: (url: string, count: number) => void;
}) {
  const [url, setUrl] = useState(current?.url ?? "");
  const [count, setCount] = useState(current?.imported.requestedCount ?? 100);
  useEffect(() => {
    if (current) {
      setUrl(current.url);
      setCount(current.imported.requestedCount);
    }
  }, [current?.url, current?.imported.requestedCount]);
  return (
    <section className="import-card">
      <div className="section-title">
        <span className="step-number">01</span>
        <div>
          <h2>Import reviews</h2>
          <p>Enter a Google Play app link and choose a review count.</p>
        </div>
      </div>
      <form
        id="import-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAnalyze(url, count);
        }}
      >
        <label htmlFor="app-url">Google Play app link</label>
        <div className="form-row">
          <div className="url-input">
            <span>↗</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              id="app-url"
              type="url"
              required
              placeholder="https://play.google.com/store/apps/details?id=…"
              aria-describedby="form-note"
            />
          </div>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            id="review-limit"
            aria-label="Number of reviews"
          >
            <option value="20">20 reviews</option>
            <option value="50">50 reviews</option>
            <option value="100">100 reviews</option>
            <option value="200">200 reviews</option>
          </select>
          <button className="primary" id="analyze-button" disabled={busy}>
            {busy ? (
              "Importing…"
            ) : (
              <>
                Import reviews <span>↗</span>
              </>
            )}
          </button>
        </div>
        <div className="form-footer">
          <span id="form-note">◉ Google Play · English · United Kingdom</span>
          <span>20–200 latest reviews per import</span>
        </div>
        {error && (
          <p id="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
