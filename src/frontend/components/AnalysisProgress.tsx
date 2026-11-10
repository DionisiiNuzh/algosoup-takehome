export function AnalysisProgress({ count }: { count: number }) {
  return (
    <section id="processing" role="status" aria-live="polite" aria-busy="true">
      <span className="eyebrow">IMPORTING REVIEWS</span>
      <h2>Fetching from Google Play…</h2>
      <p>Requesting up to {count} latest reviews. This may take a moment.</p>
    </section>
  );
}
