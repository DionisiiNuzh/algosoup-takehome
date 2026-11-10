import { useState } from "react";
import type { Analysis, Issue } from "../types";
import { demoIssues } from "../fixtures/demoAnalysis";
import { taskFor } from "../hooks/useAnalysis";
import { IssueCard } from "./IssueCard";
const categories = [
  "All feedback",
  ...demoIssues.map((i) => i.category),
  "Praise",
  "Other feedback",
];
export function AnalysisResults({
  analysis,
  onReset,
  onOpen,
}: {
  analysis: Analysis;
  onReset: () => void;
  onOpen: (issue: Issue) => void;
}) {
  const [category, setCategory] = useState("All feedback");
  return (
    <section id="results">
      <div className="results-heading">
        <div>
          <span className="eyebrow">ANALYSIS RESULTS</span>
          <h2>Review issues</h2>
          <p>
            {analysis.app} · {analysis.count} sample reviews · English / United
            States · Demo data
          </p>
        </div>
        <button className="secondary" id="reset-button" onClick={onReset}>
          New analysis ↗
        </button>
      </div>
      <div className="stats">
        <div>
          <span>Reviews in sample</span>
          <strong>{analysis.count}</strong>
          <small>Demo review sample</small>
        </div>
        <div>
          <span>Actionable issues</span>
          <strong>4</strong>
          <small>Prioritized by review count</small>
        </div>
        <div>
          <span>Average rating</span>
          <strong>
            2.4 <span className="stars">★</span>
          </strong>
          <small>Across the sample</small>
        </div>
        <div className="stat-highlight">
          <span>Language / region</span>
          <strong>English / US</strong>
          <small>Imported sample only</small>
        </div>
      </div>
      <div className="issues-title">
        <h2>
          Issues by category <span>4 issues</span>
        </h2>
        <span>Sorted by most mentioned ↓</span>
      </div>
      <div
        className="category-tabs"
        role="group"
        aria-label="Filter by category"
      >
        {categories.map((name) => (
          <button
            key={name}
            className={category === name ? "selected" : ""}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div id="issues-list">
        {category === "Praise" || category === "Other feedback" ? (
          <p className="feedback-summary">
            {category === "Praise"
              ? "Sample reviewers appreciate the clean design and useful everyday features. This feedback is separated from actionable issues."
              : "General opinions and feedback without a specific reported problem are kept here for context."}
          </p>
        ) : (
          demoIssues
            .filter(
              (i) => category === "All feedback" || i.category === category,
            )
            .map((issue, index) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={index}
                count={analysis.count}
                status={taskFor(analysis, issue).status}
                onOpen={() => onOpen(issue)}
              />
            ))
        )}
      </div>
      <div className="sample-footnote">
        ⓘ Counts reflect this sample only. One review can mention multiple
        issues. Praise and general feedback are tracked separately.
      </div>
      <div className="feedback-summary">
        <span>
          <strong>Positive feedback:</strong> Simple design and useful features.
        </span>
        <span>
          {Math.round(analysis.count * 0.16)} reviews mention something positive
          ↗
        </span>
      </div>
    </section>
  );
}
