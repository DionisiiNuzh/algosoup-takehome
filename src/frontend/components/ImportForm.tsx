import { useEffect, useState } from "react";
import type { Analysis } from "../types";
const initialCount = (count?: number) =>
  count !== undefined && Number.isInteger(count) && count >= 1 && count <= 200
    ? count
    : 10;

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
  const [count, setCount] = useState(
    initialCount(current?.imported.requestedCount),
  );
  useEffect(() => {
    if (current) {
      setUrl(current.url);
      setCount(initialCount(current.imported.requestedCount));
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
              disabled={busy}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              id="app-url"
              type="url"
              required
              placeholder="https://play.google.com/store/apps/details?id=…"
              aria-describedby="form-note"
            />
          </div>
          <input
            disabled={busy}
            type="number"
            min={1}
            max={200}
            required
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            id="review-limit"
            aria-label="Number of reviews"
          />
          <button className="primary" id="analyze-button" disabled={busy}>
            {busy ? (
              "Starting…"
            ) : (
              <>
                Analyse reviews <span>↗</span>
              </>
            )}
          </button>
        </div>
        <div className="form-footer">
          <span id="form-note">◉ Google Play · English · United Kingdom</span>
          <span>Latest reviews first</span>
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
