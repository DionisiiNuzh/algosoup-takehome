# Review-to-Action

Product requirements: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

This repository contains a live review-import frontend and API, not the completed app.
Cloudflare Workers serves the Vite build in `dist/` and routes `/api/*` to `src/worker.ts`.
The health endpoint is `/api/health`. Unknown API routes return JSON 404s.

## Fetch latest Google Play reviews

`POST /api/reviews` accepts JSON with `app` (an Android package ID or HTTPS
Google Play app details URL) and `count` (integer, default 100, range 20–200).
Reviews are fetched newest first with fixed English/GB settings.

```bash
curl http://localhost:8787/api/reviews \
  -H 'Content-Type: application/json' \
  -d '{"app":"com.virginmedia.android.youraccount","count":100}'
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
The endpoint currently returns data without storing it. Recommended next step:
connect a Cloudflare D1 database for imports, reviews, issues, and task state.
Keep import-to-review links so counts remain tied to each imported sample.

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

The product needs persistent storage. Add a Cloudflare D1 database (or another
durable store), its binding, and migrations when implementing the data model;
this scaffold does not provision a database or implement persistence.

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
code or Wrangler configuration. No credentials are required for the scaffold.

For automatic deployment later, connect the pushed repository through
Cloudflare Workers & Pages → Create → Import a repository. Use `main` as the
production branch, the repository root as the root directory, and
`npm run deploy` as the deploy command. The deploy command includes the frontend build.

Before submitting, verify the full product flow and refresh persistence against
the deployed app, then include its URL, the repository URL, and the required
agent logs. Neither a remote repository nor a live deployment has been created
by this setup.

Cloudflare reference: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/).
