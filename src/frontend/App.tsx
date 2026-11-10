import { useState } from "react";
import { AnalysisHistory } from "./components/AnalysisHistory";
import { ImportForm } from "./components/ImportForm";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { AnalysisResults } from "./components/AnalysisResults";
import { IssueDialog } from "./components/IssueDialog";
import { taskFor, useAnalysis } from "./hooks/useAnalysis";
import type { Issue } from "./types";
export default function App() {
  const model = useAnalysis();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
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
            <strong>Review analysis</strong>
          </span>
          <span className="demo-badge">
            <i /> Interactive demo
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>App reviews</h1>
              <p>Import reviews, inspect issues, and create tasks.</p>
            </div>
          </div>
          <ImportForm
            current={model.current}
            busy={busy}
            error={model.error}
            onAnalyze={(url, count) => {
              setRequestedCount(count);
              model.analyze(url, count);
            }}
          />
          {busy ? (
            <AnalysisProgress
              progress={model.progress}
              count={requestedCount}
            />
          ) : model.current ? (
            <AnalysisResults
              key={model.current.url}
              analysis={model.current}
              onReset={model.reset}
              onOpen={setSelectedIssue}
            />
          ) : (
            <section className="empty-state">
              <h2>No analysis selected</h2>
              <p>Enter an app link to start an analysis.</p>
              <p className="demo-note">
                Demo uses sample reviews. Live review import is not connected.
              </p>
            </section>
          )}
          {!model.storageAvailable && (
            <p role="status">
              Browser storage unavailable. Changes will not survive a refresh.
            </p>
          )}
        </main>
      </div>
      {selectedIssue && model.current && (
        <IssueDialog
          key={selectedIssue.id}
          issue={selectedIssue}
          task={taskFor(model.current, selectedIssue)}
          storageAvailable={model.storageAvailable}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(changes) => model.updateTask(selectedIssue, changes)}
        />
      )}
    </>
  );
}
