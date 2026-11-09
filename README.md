# Review-to-Action

Product requirements: [PRODUCT_SPEC.md](PRODUCT_SPEC.md).

This repository currently contains a deployment scaffold, not the completed app.
Cloudflare Workers serves `public/` and routes `/api/*` to `src/worker.js`.
The health endpoint is `/api/health`. Unknown API routes return JSON 404s.

## Local development

Use Node.js 22 or newer.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

Implement server routes in `src/worker.js` and frontend assets in `public/`.
If adding a frontend build tool, change `assets.directory` in `wrangler.jsonc`
to its output directory and run that build before checking or deploying.
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
`npm run deploy` as the deploy command. No frontend build command is needed
for this scaffold. Add one when the application introduces a build step.

Before submitting, verify the full product flow and refresh persistence against
the deployed app, then include its URL, the repository URL, and the required
agent logs. Neither a remote repository nor a live deployment has been created
by this setup.

Cloudflare reference: [Workers static assets](https://developers.cloudflare.com/workers/static-assets/).
