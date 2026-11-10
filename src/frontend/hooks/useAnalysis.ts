import { useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import type { Analysis, AnalysisPhase, Issue, Task } from "../types";
export function taskFor(analysis: Analysis, issue: Issue): Task {
  return (
    analysis.tasks[issue.id] ?? {
      status: "New",
      brief: `${issue.title}\n\nUser reports\n${issue.summary}\n\nSuggested investigation (hypothesis)\n${issue.action}\n\nAcceptance criteria\n- Reproduce the reported behavior using relevant device and app versions.\n- Verify the fix with a regression check.\n- Confirm the affected flow works end to end.`,
    }
  );
}
export function useAnalysis() {
  const [saved, setSaved] = useState(loadState);
  const current =
    saved.history.find((a) => a.url === saved.selectedUrl) ?? null;
  const [phase, setPhase] = useState<AnalysisPhase>(
    current ? "success" : "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    setStorageAvailable(saveState(saved));
  }, [saved]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function analyze(input: string, count: number) {
    if (busy.current) return;
    let url: URL;
    try {
      url = new URL(input);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.hostname !== "play.google.com" ||
        url.pathname !== "/store/apps/details" ||
        !url.searchParams.get("id") ||
        ![20, 50, 100, 200].includes(count)
      )
        throw new Error();
    } catch {
      setError(
        "Paste a Google Play app link that includes an app ID (…details?id=com.example.app).",
      );
      setPhase("error");
      return;
    }
    busy.current = true;
    setError("");
    setPhase("loading");
    setProgress(0);
    let step = 0;
    function tick() {
      if (step < 5) {
        step++;
        setProgress(step * 20);
        timer.current = setTimeout(tick, 650);
        return;
      }
      const analysis: Analysis = {
        url: url.href,
        app: url.searchParams.get("id")!,
        count,
        tasks: {},
      };
      setSaved((s) => ({
        history: [analysis, ...s.history.filter((a) => a.url !== analysis.url)],
        selectedUrl: analysis.url,
      }));
      busy.current = false;
      setPhase("success");
    }
    timer.current = setTimeout(tick, 650);
  }
  function select(url: string) {
    if (busy.current) return;
    setSaved((s) => ({ ...s, selectedUrl: url }));
    setError("");
    setPhase("success");
  }
  function reset() {
    setSaved((s) => ({ ...s, selectedUrl: null }));
    setError("");
    setPhase("idle");
  }
  function updateTask(issue: Issue, changes: Partial<Task>) {
    setSaved((s) => ({
      ...s,
      history: s.history.map((a) =>
        a.url === s.selectedUrl
          ? {
              ...a,
              tasks: {
                ...a.tasks,
                [issue.id]: { ...taskFor(a, issue), ...changes },
              },
            }
          : a,
      ),
    }));
  }
  return {
    current,
    history: saved.history,
    phase,
    progress,
    error,
    storageAvailable,
    analyze,
    select,
    reset,
    updateTask,
  };
}
