import { classifyReview, DEFAULT_MODEL, ModelError } from "./categorisation.ts";
import type { ModelEnv } from "./categorisation.ts";
import type {
  Category,
  Categorisation,
  CategorisationResult,
  CategoryTask,
  ReviewOutcome,
} from "./types/categories.ts";
import type { Review, ReviewImport } from "./types/reviews.ts";

// Narrow structural interfaces keep the analysis logic usable in Node tests too.
interface Sql {
  exec<T extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    ...bindings: (string | number | null)[]
  ): { toArray(): T[] };
}
export interface AnalysisObjectState {
  storage: {
    sql: Sql;
    transactionSync<T>(callback: () => T): T;
    setAlarm(time: number): Promise<void>;
    deleteAlarm(): Promise<void>;
  };
}
type Metadata = Omit<Categorisation, "categories" | "outcomes" | "tasks"> & {
  imported: Omit<ReviewImport, "reviews">;
};

export class ReviewAnalysis {
  private ctx: AnalysisObjectState;
  private env: ModelEnv;
  constructor(ctx: AnalysisObjectState, env: ModelEnv) {
    this.ctx = ctx;
    this.env = env;
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
  }
  private read<T>(key: string): T | undefined {
    const row = this.ctx.storage.sql
      .exec("SELECT value FROM records WHERE key = ?", key)
      .toArray()[0];
    return row ? (JSON.parse(row.value as string) as T) : undefined;
  }
  private write(key: string, value: unknown) {
    this.ctx.storage.sql.exec(
      "INSERT INTO records (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      JSON.stringify(value),
    );
  }
  private list<T>(prefix: string): T[] {
    return this.ctx.storage.sql
      .exec(
        "SELECT value FROM records WHERE key LIKE ? ORDER BY key",
        `${prefix}%`,
      )
      .toArray()
      .map((row) => JSON.parse(row.value as string) as T);
  }
  private snapshot(): CategorisationResult {
    const meta = this.read<Metadata>("meta")!;
    const tasks = Object.fromEntries(
      this.list<{ id: string; task: CategoryTask }>("task:").map((t) => [
        t.id,
        t.task,
      ]),
    );
    return {
      ...meta,
      imported: { ...meta.imported, reviews: this.list<Review>("review:") },
      categories: this.list<Category>("category:"),
      outcomes: this.list<ReviewOutcome>("outcome:"),
      tasks,
    };
  }
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/init" && request.method === "POST") {
      const { id, imported } = (await request.json()) as {
        id: string;
        imported: ReviewImport;
      };
      if (this.read("meta"))
        return Response.json(
          { error: "Analysis already exists." },
          { status: 409 },
        );
      const { reviews, ...info } = imported;
      this.ctx.storage.transactionSync(() => {
        reviews.forEach((review, index) =>
          this.write(`review:${String(index).padStart(4, "0")}`, review),
        );
        this.write("meta", {
          id,
          imported: info,
          status: reviews.length ? "running" : "completed",
          processedCount: 0,
          totalCount: reviews.length,
          attempts: 0,
          error: null,
          model: this.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          createdAt: new Date().toISOString(),
        } satisfies Metadata);
      });
      if (reviews.length) await this.ctx.storage.setAlarm(Date.now() + 100);
      return Response.json(this.snapshot(), { status: 201 });
    }
    const meta = this.read<Metadata>("meta");
    if (!meta)
      return Response.json({ error: "Analysis not found." }, { status: 404 });
    if (request.method === "GET")
      return Response.json(this.snapshot(), {
        headers: { "Cache-Control": "no-store" },
      });
    if (path === "/resume" && request.method === "POST") {
      if (meta.status === "paused") {
        this.write("meta", {
          ...meta,
          status: "running",
          attempts: 0,
          error: null,
        });
        await this.ctx.storage.setAlarm(Date.now() + 100);
      }
      return Response.json(this.snapshot(), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (path.startsWith("/tasks/") && request.method === "PATCH") {
      const id = path.slice("/tasks/".length);
      if (!this.read(`category:${id}`))
        return Response.json({ error: "Category not found." }, { status: 404 });
      const task = (await request.json()) as CategoryTask | null;
      if (
        !task ||
        !["New", "Planned", "Resolved"].includes(task.status) ||
        typeof task.brief !== "string" ||
        task.brief.length > 20000
      )
        return Response.json({ error: "Invalid task." }, { status: 400 });
      this.write(`task:${id}`, {
        id,
        task: { status: task.status, brief: task.brief },
      });
      return Response.json({ task });
    }
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  async alarm(): Promise<void> {
    const meta = this.read<Metadata>("meta");
    if (!meta || meta.status !== "running") return;
    const index = meta.processedCount;
    const review = this.read<Review>(
      `review:${String(index).padStart(4, "0")}`,
    );
    if (!review) throw new Error("Missing review in analysis storage.");
    // A watchdog survives an eviction between committing the cursor and scheduling the next review.
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
    try {
      const result = await classifyReview(
        review,
        this.list<Category>("category:"),
        { ...this.env, ANTHROPIC_MODEL: meta.model },
      );
      this.ctx.storage.transactionSync(() => {
        // Persist evidence, newly discovered categories and cursor atomically.
        result.categories.forEach((category) =>
          this.write(`category:${category.id}`, category),
        );
        this.write(`outcome:${String(index).padStart(4, "0")}`, result.outcome);
        this.write("meta", {
          ...meta,
          processedCount: index + 1,
          attempts: 0,
          error: null,
          status: index + 1 === meta.totalCount ? "completed" : "running",
        });
      });
      if (index + 1 < meta.totalCount)
        await this.ctx.storage.setAlarm(Date.now() + 100);
      else await this.ctx.storage.deleteAlarm();
    } catch (error) {
      // Storage/runtime errors must reach Cloudflare's alarm retry mechanism.
      if (!(error instanceof ModelError)) throw error;
      const attempts = meta.attempts + 1;
      const paused = !error.retryable || attempts >= 3;
      this.write("meta", {
        ...meta,
        attempts,
        status: paused ? "paused" : "running",
        error: error.message,
      });
      if (paused) await this.ctx.storage.deleteAlarm();
      else
        await this.ctx.storage.setAlarm(
          Date.now() + 2000 * 2 ** (attempts - 1),
        );
    }
  }
}
