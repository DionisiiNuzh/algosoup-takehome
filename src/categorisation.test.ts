import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ReviewAnalysis } from "./analysis-object.ts";
import type { AnalysisObjectState } from "./analysis-object.ts";
import {
  classifyReview,
  validateClassification,
  ModelError,
} from "./categorisation.ts";
import type { CategorisationResult, Category } from "./types/categories.ts";
import type { Review, ReviewImport } from "./types/reviews.ts";

const review = (id: string, text: string): Review => ({
  reviewId: id,
  text,
  appId: "com.test.app",
  rating: 2,
  reviewedAt: null,
  authorName: null,
  helpfulCount: null,
  appVersion: null,
  sourceUrl: null,
  developerReply: null,
});
const category: Category = {
  id: "existing",
  name: "Login loops",
  description: "Login returns to sign in.",
  action: "Investigate the sign-in flow.",
};
const newIssue = (excerpt: string, name = "Payments fail") => ({
  categoryId: null,
  excerpt,
  newCategory: {
    name,
    description: "Reviewers cannot complete this flow.",
    action: "Investigate the reported flow (hypothesis).",
  },
});
const existingIssue = (excerpt: string, id = "existing") => ({
  categoryId: id,
  newCategory: null,
  excerpt,
});
const output = (issues: unknown[], praise = false, nonActionable = false) => ({
  issues,
  praise,
  nonActionable,
});
const toolResponse = (input: unknown) =>
  Response.json({
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name: "classify_review", input }],
  });

test("multiple issues reuse categories and deduplicate links; mixed praise is preserved", () => {
  const r = review("1", "Love it, but login loops and payments fail.");
  const result = validateClassification(
    output(
      [
        existingIssue("login loops"),
        newIssue("payments fail"),
        existingIssue("login loops"),
      ],
      true,
    ),
    r,
    [category],
    () => "new-id",
  );
  assert.equal(result.categories.length, 1);
  assert.equal(result.outcome.assignments.length, 2);
  assert.deepEqual(
    result.outcome.assignments.map((a) => a.categoryId),
    ["existing", "new-id"],
  );
  assert.equal(result.outcome.praise, true);
});

test("rejects invented evidence, unknown IDs and missing classification; reuses exact names", () => {
  const r = review("1", "login loops");
  for (const value of [
    output([existingIssue("not in review")]),
    output([existingIssue("login loops", "missing")]),
    output([]),
  ]) {
    assert.throws(
      () => validateClassification(value, r, [category]),
      ModelError,
    );
  }
  const result = validateClassification(
    output([newIssue("login loops", "LOGIN LOOPS")]),
    r,
    [category],
  );
  assert.equal(result.categories.length, 0);
  assert.equal(result.outcome.assignments[0].categoryId, "existing");
});

test("provider receives the current catalogue and rejects truncated or malformed output", async () => {
  const r = review("1", "login loops");
  await classifyReview(
    r,
    [category],
    { ANTHROPIC_API_KEY: "test-only" },
    async (_url, init) => {
      const body = JSON.parse(init!.body as string);
      assert.equal(body.tool_choice.name, "classify_review");
      assert.equal(
        JSON.parse(body.messages[0].content).catalogue[0].id,
        "existing",
      );
      return toolResponse(output([existingIssue("login loops")]));
    },
  );
  for (const response of [
    Response.json({ stop_reason: "max_tokens", content: [] }),
    new Response("{"),
  ]) {
    await assert.rejects(
      classifyReview(
        r,
        [],
        { ANTHROPIC_API_KEY: "test-only" },
        async () => response,
      ),
      ModelError,
    );
  }
});

function fixture(reviews: Review[]) {
  const db = new DatabaseSync(":memory:");
  let alarm: number | null = null;
  const state: AnalysisObjectState = {
    storage: {
      sql: {
        exec(query, ...bindings) {
          const rows = db.prepare(query).all(...bindings);
          return { toArray: () => rows as never };
        },
      },
      transactionSync(callback) {
        db.exec("BEGIN");
        try {
          const result = callback();
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      async setAlarm(time) {
        alarm = time;
      },
      async deleteAlarm() {
        alarm = null;
      },
    },
  };
  const imported: ReviewImport = {
    appId: "com.test.app",
    requestedCount: reviews.length || 5,
    fetchedCount: reviews.length,
    fetchedAt: new Date().toISOString(),
    language: "en",
    country: "gb",
    sort: "newest",
    reviews,
  };
  const env = { ANTHROPIC_API_KEY: "test-only" };
  let object = new ReviewAnalysis(state, env);
  return {
    async init() {
      return object.fetch(
        new Request("https://object/init", {
          method: "POST",
          body: JSON.stringify({ id: "test", imported }),
        }),
      );
    },
    async snapshot(): Promise<CategorisationResult> {
      return (
        await object.fetch(new Request("https://object/"))
      ).json() as Promise<CategorisationResult>;
    },
    async alarm() {
      return object.alarm();
    },
    async resume() {
      return object.fetch(
        new Request("https://object/resume", { method: "POST" }),
      );
    },
    async task(id: string) {
      return object.fetch(
        new Request(`https://object/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Planned", brief: "Edited task" }),
        }),
      );
    },
    restart() {
      object = new ReviewAnalysis(state, env);
    },
    get scheduled() {
      return alarm;
    },
    close() {
      db.close();
    },
  };
}

test("five-review analysis processes sequentially, persists evidence/tasks across restart, and completes exactly once", async (t) => {
  const f = fixture([
    review("1", "login loops"),
    review("2", "login loops and payments fail"),
    review("3", "Great app"),
    review("4", "Bad app"),
    review("5", "payments fail"),
  ]);
  t.after(() => f.close());
  let call = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(init!.body as string);
      const catalogue = JSON.parse(request.messages[0].content)
        .catalogue as Category[];
      call++;
      if (call === 1) {
        assert.equal(catalogue.length, 0);
        return toolResponse(output([newIssue("login loops", "Login loops")]));
      }
      const login = catalogue.find((c) => c.name === "Login loops")!;
      if (call === 2) {
        assert.equal(catalogue.length, 1);
        return toolResponse(
          output([
            existingIssue("login loops", login.id),
            newIssue("payments fail"),
          ]),
        );
      }
      if (call === 3) return toolResponse(output([], true));
      if (call === 4) return toolResponse(output([], false, true));
      return toolResponse(
        output([
          existingIssue(
            "payments fail",
            catalogue.find((c) => c.name === "Payments fail")!.id,
          ),
        ]),
      );
    },
  );
  assert.equal((await f.init()).status, 201);
  for (let i = 0; i < 5; i++) {
    await f.alarm();
    f.restart();
    assert.equal((await f.snapshot()).processedCount, i + 1);
  }
  const result = await f.snapshot();
  assert.equal(result.status, "completed");
  assert.equal(result.categories.length, 2);
  assert.equal(result.outcomes.length, 5);
  assert.equal(result.outcomes[1].assignments.length, 2);
  assert.equal(f.scheduled, null);
  await f.alarm();
  assert.equal(call, 5);
  assert.equal((await f.task(result.categories[0].id)).status, 200);
  f.restart();
  assert.equal(
    (await f.snapshot()).tasks[result.categories[0].id].brief,
    "Edited task",
  );
});

test("invalid model results never partially commit; bounded retries pause and resume the same review", async (t) => {
  const f = fixture([review("1", "login loops")]);
  t.after(() => f.close());
  const mock = t.mock.method(globalThis, "fetch", async () =>
    toolResponse(
      output([newIssue("login loops"), newIssue("invented evidence")]),
    ),
  );
  await f.init();
  for (let i = 1; i <= 3; i++) {
    await f.alarm();
    const state = await f.snapshot();
    assert.equal(state.processedCount, 0);
    assert.equal(state.categories.length, 0);
    assert.equal(state.attempts, i);
  }
  assert.equal((await f.snapshot()).status, "paused");
  assert.equal(f.scheduled, null);
  f.restart();
  mock.mock.mockImplementation(async () =>
    toolResponse(output([newIssue("login loops", "Login loops")])),
  );
  await f.resume();
  await f.alarm();
  assert.equal((await f.snapshot()).status, "completed");
  assert.equal((await f.snapshot()).categories.length, 1);
});

test("authentication errors pause immediately and empty samples complete without model calls", async (t) => {
  const f = fixture([review("1", "login loops")]);
  const empty = fixture([]);
  t.after(() => {
    f.close();
    empty.close();
  });
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 401 }),
  );
  await f.init();
  await f.alarm();
  assert.equal((await f.snapshot()).status, "paused");
  assert.equal((await f.snapshot()).attempts, 1);
  await empty.init();
  await empty.alarm();
  assert.equal((await empty.snapshot()).status, "completed");
  assert.equal(mock.mock.callCount(), 1);
});
