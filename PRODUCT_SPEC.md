# Review-to-Action — MVP source of truth

## Goal and constraints
Help teams behind poorly rated Android apps turn recent Google Play reviews into evidence-backed work they can assign to developers or management. Deliver a working, deployed web app within the take-home's **one-hour total limit**.

The take-home rejects simple LLM wrappers. This product must have a real review import, structured issue records linked to source reviews, persistent state, and a workflow from analysis to an actionable task.

## Core user flow
1. Paste a Google Play app URL and choose how many recent reviews to import (default **10**, range **1–200**).
2. Import real reviews, show the app identity, and report the actual number retrieved. Use one explicit language/region for the MVP; display it alongside the results.
3. Analyze the reviews to discover specific recurring issues, with no broad category layer. **Issue labels must emerge from the reviews**, rather than a fixed list of assumed bugs. Separate praise and non-actionable feedback from actionable issues. A review can support multiple issues.
4. Show a prioritized issue list with a short summary, supporting-review count, share of imported reviews, and proposed next action. Default order: supporting-review count, descending. Counts represent this imported sample, not the entire app's users.
5. Open an issue to see its evidence: original review text, rating, date, and a source link when available. Explain the reported problem and suggest an investigation or resolution; distinguish user reports from hypotheses about root cause.
6. Generate an editable, copyable task brief for an issue. Track its status as **New → Planned → Resolved**. Keep results, edits, and statuses after a page refresh.

## Implementation guidance for agents
This file governs product scope. Choose the simplest deployable stack and reliable integration that fit the time limit. Coordinate around the shared data model and complete the core flow before adding polish. Record material scope changes here so agents share the same requirements.

## Frontend scope decisions
- No accounts, sign-in, profiles, or workspace management in the one-hour MVP.
- Use functional headings and concise instructions; omit marketing copy.
- The left sidebar lists previously analyzed companies/apps and opens their saved results.
- The frontend imports real reviews and starts incremental model categorisation. Cloudflare Durable Objects persist reviews, categories, evidence, progress and saved tasks. Browser-local history stores pointers and cached results; task edits require an explicit Save task action. See CATEGORIES.md for the agreed analysis rules.
