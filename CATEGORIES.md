# Incremental review categorisation

- Analyse the actual fetched sample, using the requested review count (1–200; no separate categorisation limit). Start with 5 reviews for a small trial.
- Each analysis is scoped to one app and starts with zero categories. Nothing carries across analyses.
- Process newest reviews sequentially. Send one review and the current category catalogue to the model.
- Categories describe specific reported problems, not broad areas. Reuse matching categories or create a specific name, scope description and suggested investigation.
- One review may support several categories. Save an exact supporting excerpt for every link.
- Track praise and non-actionable feedback separately, including in mixed reviews. Reviews with no actionable issues still count as processed.
- Validate the complete response before committing categories, evidence and progress atomically. Derive counts from unique review links.
- Persist on Cloudflare in one SQLite-backed Durable Object per analysis. Alarms process one review at a time and continue without an open browser.
- Retry transient/model-validation failures up to three attempts per review. Pause after failure; resume the same review without duplicating saved results. Authentication/configuration errors pause immediately.
- Display progress, specific issues sorted by supporting-review count, original evidence, and editable/copyable tasks with New → Planned → Resolved statuses.
- No broad grouping, cross-analysis taxonomy, batching, automatic merging or parallel classification in this version.
