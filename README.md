# Review-to-Action

Product requirements: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

This repository contains a live review-import frontend and API, not the completed app.
Cloudflare Workers serves the Vite build in `dist/` and routes `/api/*` to `src/worker.ts`.
The health endpoint is `/api/health`. Unknown API routes return JSON 404s.

## Fetch latest Google Play reviews

`POST /api/reviews` accepts JSON with `app` (an Android package ID or HTTPS
Google Play app details URL) and `count` (integer, default 10, range 1–200).
Reviews are fetched newest first with fixed English/GB settings.

```bash
curl http://localhost:8787/api/reviews \
  -H 'Content-Type: application/json' \
  -d '{"app":"com.virginmedia.android.youraccount","count":10}'
```

The response includes `appId`, `language`, `country`, `sort`, `requestedCount`,
`fetchedCount`, `fetchedAt`, and normalized `reviews`. Each review preserves
its ID, original text, rating, timestamp, source URL, helpful votes, version,
author, and developer reply where available. Empty comments and duplicate IDs
are excluded; actual count can be lower than requested. Invalid input returns
400, unsupported methods 405, and upstream failures 502.

The reusable function is `fetchLatestReviews({ app, count })` in `src/reviews.ts`.
Shared `Review`, `ReviewRating`, `ReviewImport`, and `FetchReviewsInput` types live
in `src/types/reviews.ts`; frontend code re-exports the same review types.
The fetcher returns `Promise<ReviewImport>`. Import shared types with `import type`
so they add no runtime dependencies to frontend code.
It uses `google-play-scraper` with bounded request timeouts and retries disabled.
A transport hook disables got's cookie jar to avoid incompatible Set-Cookie
handling in the Workers HTTP shim. A local Worker smoke test fetched 200 unique
reviews across pages for the reference app. Production deployment remains untested.

Run `npm test` for validation, normalization, deduplication, and API error checks.
Tests run TypeScript through Node's type stripping. `npm run check` runs strict
type checking for both the frontend and Worker; the Worker configuration is
`tsconfig.worker.json`. Wrangler bundles `src/worker.ts` for deployment.
The import-only endpoint returns data without storing it. Use `/api/analyses` for the persisted categorisation flow below.

## Frontend review import

The import form calls `POST /api/reviews` and displays actual returned counts and
reviews. `ReviewList` in `src/frontend/components/ReviewList.tsx` is a reusable
widget accepting `reviews: Review[]` and an optional `pageSize` (default 10).
Pagination browses the imported sample locally without additional API calls.
It shows original text, author, rating, date, helpful votes, app version,
developer reply, and Google Play source links when available.

Imports and selected app are saved in browser storage under `reviewroom-live-v1`.
Old demo data stays separate. Upstream errors are shown with no sample fallback.
Categorisation is pending; the live import screen does not generate issue groups
or task briefs. The widget can remain mounted alongside future categorisation.

Browser verification against the local Worker fetched 200 real reviews, checked
all 20 pages, refresh persistence, upstream-error handling, and mobile overflow.

## Categorisation Worker

Copy `.dev.vars.example` to `.dev.vars` and set `ANTHROPIC_API_KEY` locally. Production:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy
```

The default model is `claude-haiku-5-5`; optionally override `ANTHROPIC_MODEL` in local vars or as a Worker secret. Keys never go to the browser. Review text is sent to Anthropic for classification.

The frontend's Analyse reviews action calls `POST /api/analyses` with `{ "app": "com.example.app", "count": 5 }`. Any integer count from 1 to 200 is supported. This imports reviews, persists them, and returns an analysis ID and initial snapshot with HTTP 201. If the model key is missing, it returns 503 before fetching reviews.

- `GET /api/analyses/:id`: full snapshot, original reviews, categories, evidence assignments and tasks.
- `POST /api/analyses/:id/resume`: resume a paused analysis at the unsaved review.
- `PATCH /api/analyses/:id/tasks/:categoryId`: save `{ "status": "Planned", "brief": "Edited task" }`.

Each analysis begins with an empty catalogue. A Durable Object alarm classifies one review at a time against the catalogue discovered so far, validates exact evidence, and commits categories, assignments and the progress cursor in one SQLite transaction. Reviews can support multiple specific issues and contain praise/non-actionable feedback. Counts use unique saved review links and the actual imported sample as denominator. Category descriptions and suggested investigations are established when each category is first discovered; they are not a separate final synthesis call.

Transient provider failures and invalid output get up to three attempts per review with backoff; authentication and other non-retryable errors pause immediately. Resume is explicit. Processing continues after closing the tab, and history in the same browser reloads server progress. There is no cross-analysis catalogue, broad grouping, merging or batching. Task edits persist after clicking Save task.

Analysis IDs are unguessable access links, with no accounts in this MVP. Browser-local history is the discovery mechanism; clearing it loses those pointers, though server records remain retrievable by ID. Creating an analysis is currently public and incurs provider calls; restrict access at Cloudflare before sharing beyond a controlled demo.

`npm test` covers classification validation, multi-issue links, sequential catalogue reuse, retries/resume, atomic persistence and task restoration. Tests use SQLite and mocked model responses; they do not spend provider credits.

## Local development

Use Node.js 22 or newer.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

`npm run dev` builds assets, then starts both the Worker backend and the Vite
frontend with hot reload. Wait until both servers report ready and open the Vite
URL printed in the terminal. Stopping the command stops both child processes.
Vite proxies `/api/*` to the Worker at `127.0.0.1:8787`.

For separate terminals, run `npm run build`, then `npm run dev:worker` in one
terminal and `npm run dev:web` in another. Running only `dev:web` does not start
the backend. An unavailable backend returns a descriptive JSON 503 response;
a Google Play fetch failure returns JSON 502 from the Worker. Localhost is
supported and does not require a Cloudflare deployment.

Implement server routes in `src/worker.ts`. The React + TypeScript frontend is
in `src/frontend/`, with components, workflow hooks, API/storage helpers, shared
types, demo fixtures, and CSS in separate files. `index.html` is the Vite entry.
`npm run build` checks frontend types and builds assets into `dist/`.
`npm run format` formats frontend source. Deployment scripts build automatically.

Use Worker-compatible dependencies; Node compatibility does not provide a
traditional persistent Node server or writable durable filesystem.

SQLite-backed Durable Objects store analysis data. The `ANALYSES` binding and class migration are in `wrangler.jsonc`; no separate D1 provisioning is needed. Local Wrangler storage lives under `.wrangler/` and is separate from production.

## Initialize Git

The setup session could not initialize Git because `.git/` was mounted read-only.
Run these commands from a normal local terminal in this directory:

```bash
git init -b main
git add .
git diff --cached --stat
git commit -m "Prepare Cloudflare deployment scaffold"
```

Create an empty repository on your preferred Git host, then connect and push it:

```bash
git remote add origin <repository-url>
git push -u origin main
```

`.gitignore` excludes dependencies, build output, local credentials, and agent
configuration directories. Keep the required unedited agent logs separately
for submission and review them before publishing, since they may contain secrets.

## Validate and deploy when ready

```bash
npm run check
npm run deploy:check
npx wrangler login
npm run deploy
```

The dry run bundles locally without publishing. Deployment uses your logged-in
Cloudflare account and prints the live URL. The Worker name is
`algosoup-takehome`; change it in `wrangler.jsonc` if needed.

Keep local server secrets in `.dev.vars`. Set production secrets individually
with `npx wrangler secret put SECRET_NAME`; never put credentials in frontend
code or Wrangler configuration. Categorisation requires the server-side `ANTHROPIC_API_KEY` secret. Review-only imports do not require it.

For automatic deployment later, connect the pushed repository through
Cloudflare Workers & Pages → Create → Import a repository. Use `main` as the
production branch, the repository root as the root directory, and
`npm run deploy` as the deploy command. The deploy command includes the frontend build.

Before submitting, verify the full product flow and refresh persistence against
the deployed app, then include its URL, the repository URL, and the required
agent logs. Check your Cloudflare account for the deployed Worker URL after deployment.

Cloudflare reference: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/).
