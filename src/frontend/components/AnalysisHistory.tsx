import type { Analysis } from "../types";
export function AnalysisHistory({
  history,
  selectedUrl,
  busy,
  onSelect,
}: {
  history: Analysis[];
  selectedUrl?: string;
  busy: boolean;
  onSelect: (url: string) => void;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/">
        Review analysis
      </a>
      <div className="nav-label history-label">ANALYZED APPS</div>
      <div id="analysis-history">
        {history.map((a) => (
          <button
            key={a.url}
            className={`history-item${a.url === selectedUrl ? " active" : ""}`}
            disabled={busy}
            onClick={() => onSelect(a.url)}
          >
            <strong>{a.app}</strong>
            <small>{a.count} sample reviews</small>
          </button>
        ))}
      </div>
      {history.length === 0 && (
        <p id="history-empty">Analyzed apps will appear here.</p>
      )}
    </aside>
  );
}
