import type { Issue, TaskStatus } from "../types";
export function IssueCard({
  issue,
  index,
  count,
  status,
  onOpen,
}: {
  issue: Issue;
  index: number;
  count: number;
  status: TaskStatus;
  onOpen: () => void;
}) {
  return (
    <button className="issue-card" onClick={onOpen}>
      <span className="issue-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="issue-content">
        <div className="issue-meta">
          <span className={`tag ${issue.color}`}>{issue.category}</span>
          <span>{status}</span>
        </div>
        <h3>{issue.title}</h3>
        <p>{issue.summary}</p>
      </div>
      <div className="issue-count">
        <strong>{Math.round(count * issue.ratio)}</strong>
        <small>{Math.round(issue.ratio * 100)}% of sample</small>
      </div>
      <span className="issue-arrow">↗</span>
    </button>
  );
}
