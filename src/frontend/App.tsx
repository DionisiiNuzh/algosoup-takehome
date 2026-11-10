import { useState } from "react";
import { AnalysisHistory } from "./components/AnalysisHistory";
import { ImportForm } from "./components/ImportForm";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { ReviewList } from "./components/ReviewList";
import { useAnalysis } from "./hooks/useAnalysis";

export default function App() {
  const model = useAnalysis();
  const [requestedCount, setRequestedCount] = useState(100);
  const busy = model.phase === "loading";
  return (
    <>
      <AnalysisHistory
        history={model.history}
        selectedUrl={model.current?.url}
        busy={busy}
        onSelect={model.select}
      />
      <div className="main-shell">
        <header>
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>Review imports</strong>
          </span>
          <span className="demo-badge">
            <i /> Live Google Play reviews
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>App reviews</h1>
              <p>
                Import the latest Google Play reviews and inspect the original
                feedback.
              </p>
            </div>
          </div>
          <ImportForm
            current={model.current}
            busy={busy}
            error={model.error}
            onAnalyze={(url, count) => {
              setRequestedCount(count);
              void model.analyze(url, count);
            }}
          />
          {busy ? (
            <AnalysisProgress count={requestedCount} />
          ) : model.current ? (
            <section id="results">
              <div className="results-heading">
                <div>
                  <span className="eyebrow">IMPORT RESULTS</span>
                  <h2>Latest reviews</h2>
                  <p>
                    {model.current.app} · English / United Kingdom · Newest
                    first
                  </p>
                </div>
                <button className="secondary" onClick={model.reset}>
                  New import ↗
                </button>
              </div>
              <p role="status">
                Retrieved {model.current.imported.fetchedCount} of{" "}
                {model.current.imported.requestedCount} requested reviews.
              </p>
              <p className="categorisation-note">
                Categorisation has not started. Browse the imported reviews
                below.
              </p>
              <ReviewList
                key={`${model.current.url}:${model.current.imported.fetchedAt}`}
                reviews={model.current.imported.reviews}
              />
            </section>
          ) : (
            <section className="empty-state">
              <h2>No reviews imported</h2>
              <p>Enter an app link to fetch its latest reviews.</p>
            </section>
          )}
          {!model.storageAvailable && (
            <p role="status">
              Browser storage unavailable. Imports will not survive a refresh.
            </p>
          )}
        </main>
      </div>
    </>
  );
}
