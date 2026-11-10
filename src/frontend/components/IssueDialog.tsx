import { useEffect, useRef, useState } from "react";
import type { Issue, Task, TaskStatus } from "../types";
export function IssueDialog({
  issue,
  task,
  storageAvailable,
  onClose,
  onUpdate,
}: {
  issue: Issue;
  task: Task;
  storageAvailable: boolean;
  onClose: () => void;
  onUpdate: (changes: Partial<Task>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const brief = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(task.brief);
      setCopied(true);
      setCopyError(false);
    } catch {
      brief.current?.select();
      setCopyError(true);
    }
  }
  return (
    <dialog
      ref={dialog}
      id="issue-dialog"
      aria-labelledby="detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          onClose();
      }}
    >
      <div className="modal-heading">
        <span className="eyebrow">ISSUE DETAILS</span>
        <button onClick={onClose} aria-label="Close issue">
          ×
        </button>
      </div>
      <h2 id="detail-title">{issue.title}</h2>
      <p>{issue.summary}</p>
      <label htmlFor="issue-status">Issue status</label>
      <select
        id="issue-status"
        value={task.status}
        onChange={(event) =>
          onUpdate({ status: event.target.value as TaskStatus })
        }
      >
        <option>New</option>
        <option>Planned</option>
        <option>Resolved</option>
      </select>
      <h3>What reviewers reported</h3>
      <div>
        {issue.reviews.map(([text, rating, date]) => (
          <div key={text} className="evidence-review">
            <p>{text}</p>
            <small>
              {"★".repeat(rating)}
              {"☆".repeat(5 - rating)} · {date} · Illustrative sample review
            </small>
          </div>
        ))}
      </div>
      <p className="hypothesis">
        Suggested investigations below are hypotheses, not confirmed root
        causes.
      </p>
      <label htmlFor="task-brief">Editable task brief</label>
      <textarea
        ref={brief}
        id="task-brief"
        rows={8}
        value={task.brief}
        onChange={(event) => {
          onUpdate({ brief: event.target.value });
          setCopied(false);
        }}
      />
      <div className="modal-footer">
        <span role="status">
          {copyError
            ? "Select and copy the task text manually"
            : storageAvailable
              ? "Saved in this browser"
              : "Browser storage unavailable"}
        </span>
        <button className="primary" onClick={copy}>
          {copied ? "Copied ✓" : "Copy task brief ↗"}
        </button>
      </div>
    </dialog>
  );
}
