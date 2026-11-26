## Software Factory rules

These apply to every agent the software factory runs in this project.

1. **Files are the handoff.** Each run has a directory under `.factory/runs/` holding `task.md`, `triage.md` (only for ad-hoc items), `spec.md`, `build.md`, `review.md`. Read what earlier stages wrote; do not assume shared memory with another model. Your final reply is your stage's output: the orchestrator saves it, so do not write into `.factory/` yourself.
2. **Never edit governance files:** `BACKLOG.md`, `factory.config.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.git`, `.factory/`, `graphify-out/`. A guard hook blocks it. Never commit, push or open pull requests; the orchestrator does that after a person approves.
3. **Stay in scope.** Do the task in `task.md` and nothing else. If you find other work, end your output with a `## Follow-ups` heading and one `- ` line per item; it goes to the backlog Inbox for a person to promote.
4. **Least code that works.** Reuse what is in this project, then the standard library, then the platform, then an installed dependency. No new dependency for what a few lines do. No abstractions, config or scaffolding for needs that do not exist yet.
5. **Never cut:** input validation at trust boundaries, error handling that prevents data loss, security checks, tests for non-trivial logic.
6. **No secrets in files.**
7. **Graph first, if there is one.** When `graphify-out/GRAPH_REPORT.md` exists, read it before opening source files.
