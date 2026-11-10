import { useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import {
  startAnalysis,
  getAnalysis,
  resumeAnalysis,
  saveCategoryTask,
} from "../lib/api";
import type {
  CategorisationResult,
  CategoryTask,
} from "../../types/categories";
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
  const [error, setError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  function acceptResult(result: CategorisationResult) {
    const { imported, ...categorisation } = result;
    const analysis: Analysis = {
      url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(imported.appId)}`,
      app: imported.appId,
      count: imported.fetchedCount,
      imported,
      tasks: {},
      categorisation,
    };
    setSaved((s) => ({
      history: [analysis, ...s.history.filter((a) => a.url !== analysis.url)],
      selectedUrl: analysis.url,
    }));
  }
  const analysisId = current?.categorisation?.id;
  const analysisStatus = current?.categorisation?.status;
  useEffect(() => {
    if (!analysisId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await getAnalysis(analysisId!, controller.signal);
        if (controller.signal.aborted) return;
        const { imported, ...categorisation } = result;
        setSaved((s) => ({
          ...s,
          history: s.history.map((a) =>
            a.categorisation?.id === result.id
              ? { ...a, imported, categorisation }
              : a,
          ),
        }));
        setError("");
        if (result.status === "running") timer = setTimeout(refresh, 1500);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Could not refresh analysis.",
        );
        timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [analysisId, analysisStatus]);
  const activeRequest = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    setStorageAvailable(saveState(saved));
  }, [saved]);
  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );
  async function analyze(input: string, count: number) {
    if (busy.current) return;
    let url: URL;
    try {
      url = new URL(input);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "play.google.com" ||
        url.pathname !== "/store/apps/details" ||
        !url.searchParams.get("id") ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 200
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
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const result = await startAnalysis(url.href, count, controller.signal);
      if (controller.signal.aborted) return;
      acceptResult(result);
      setPhase("success");
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(
        error instanceof Error
          ? error.message
          : "Could not start analysis. Please try again.",
      );
      setPhase("error");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        busy.current = false;
      }
    }
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
  async function resume() {
    if (!analysisId) return;
    try {
      acceptResult(await resumeAnalysis(analysisId));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resume analysis.",
      );
    }
  }
  async function updateCategoryTask(categoryId: string, task: CategoryTask) {
    if (!analysisId) throw new Error("No analysis selected.");
    await saveCategoryTask(analysisId, categoryId, task);
    setSaved((s) => ({
      ...s,
      history: s.history.map((a) =>
        a.categorisation?.id === analysisId
          ? {
              ...a,
              categorisation: {
                ...a.categorisation,
                tasks: { ...a.categorisation.tasks, [categoryId]: task },
              },
            }
          : a,
      ),
    }));
  }
  return {
    resume,
    updateCategoryTask,
    current,
    history: saved.history,
    phase,
    error,
    storageAvailable,
    analyze,
    select,
    reset,
    updateTask,
  };
}
