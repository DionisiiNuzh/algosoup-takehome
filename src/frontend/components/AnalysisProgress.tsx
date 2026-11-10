import { processingSamples } from "../fixtures/demoAnalysis";
export function AnalysisProgress({
  progress,
  count,
}: {
  progress: number;
  count: number;
}) {
  const step = progress / 20;
  const caption =
    step < 3
      ? `Processing sample reviews · ${Math.round((count * progress) / 100)} of ${count}`
      : step < 5
        ? "Grouping recurring issues and separating positive feedback…"
        : "Preparing your priorities…";
  return (
    <section id="processing" aria-live="polite">
      <div className="processing-heading">
        <div>
          <span className="eyebrow">PROCESSING REVIEWS</span>
          <h2>Analyzing reviews</h2>
          <p>{caption}</p>
        </div>
        <strong>{progress}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Analyzing reviews"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div id="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div>
        {processingSamples
          .slice(0, Math.min(step + 1, 5))
          .map(([initials, text]) => (
            <div key={initials} className="processing-review">
              <span className="review-avatar">{initials}</span>
              <p>{text}</p>
              <span className="done">✓ Processed</span>
            </div>
          ))}
      </div>
    </section>
  );
}
