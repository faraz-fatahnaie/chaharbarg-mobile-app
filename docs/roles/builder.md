# Notes for the builder

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-002, 2026-11-15) Docs-only features here are checked by grep for stale values (62, 100, single deal) in the changed files, plus the three gate commands.
- (F-001, 2026-11-15) `fixMatchTarget` and `rulesFrom` are tested in `apps/mobile/src/lib/match.test.ts`, and the engine tests are in `packages/engine/test/engine.test.ts`.
- (F-003, 2026-11-15) `npm run cap:sync -w @chaharbarg/mobile` needs a native toolchain and was not run in this task, so the generated Capacitor files are still unregistered for the local-notifications plugin.
- (F-003, 2026-11-15) `sound.ts` caches its AudioContext, so tests that stub `globalThis.window` must call `vi.resetModules()` and re-import the module in each case.
- (F-006, 2026-11-15) Tests in `apps/mobile/src/lib/*.test.ts` run in Node under vitest, so browser APIs must not run when a module loads; call `vi.resetModules()` before re-importing `store.ts` to simulate a restart.
- (F-039, 2026-11-15) `docs/runbook.md` and `docs/plan.md` mention the old cap in more places than the spec lists, so run the cap grep over all of `docs/` before you finish.
- (F-004, 2026-11-15) Engine tests for the live score sit in `packages/engine/test/engine.test.ts`; the gates are `npm test` plus the two typecheck commands.
- (F-004, 2026-11-15) Browsers often ignore `max-width` on table cells, so long names in `.live td.nm` may need a `<span>` wrapper to truncate with an ellipsis.
- (F-005, 2026-11-16) `.factory/` is blocked for agents, so a stale line in `build.md` (pace "about 11 … about 25") cannot be corrected by the builder and must be fixed by a person.
- (F-049, 2026-11-16) On `factory/F-005`, the `quit` field and forfeit XP penalty exist only on that branch, so the F-005 merge needs its `quit?: boolean` and `quit: true` kept alongside `games: m.quit ? 0 : 1`.
- (F-052, 2026-11-17) Gate commands are `npm test`, `npm run typecheck -w @chaharbarg/engine` and `npm run typecheck -w @chaharbarg/mobile`; run all three.
- (F-051, 2026-11-17) `apps/mobile/src/economy/xp-rate.test.ts` reuses the auto-play loop from `packages/engine/test/bot-strength.test.ts` and runs a seeded simulation with a 60 s timeout.
- (F-002, 2026-11-18) A guard hook blocks shell searches that touch `.git`, `.claude` or other governance paths, so grep only the specific project files you are checking.
- (F-002, 2026-11-18) `README.md` and `docs/rules-spec.md` stay in an unmerged (`UU`) state until someone runs `git add` on them, so mark them resolved before committing.
- (F-001, 2026-11-18) `apps/mobile/src/economy/economy.ts` still has `'single'` and numeric-target branches in `xpShare` and `bigMarginAt`, which the engine can no longer produce; they are dead code until the XP follow-up.
- (F-050, 2026-11-18) `toBe` treats `-0` and `0` as different, so compare a negated gain with `0 - x` or use `toEqual` when a forfeit loss is zero.
- (F-002, 2026-11-18) `git add` needs approval in this environment, so a merge-conflict fix can leave the file unmerged (`UU`) until someone stages it.
- (F-054, 2026-11-19) The spec asks for a manual 360×640 check of the Home forfeit dialog in fa and en, and the gates do not render screens, so this check is the only layout verification.
- (F-056, 2026-11-19) `build.md` is blocked for agents, so the manual on-device check for UI copy changes has to be recorded by a person.
- (F-054, 2026-11-19) Strings live next to the UI as `tr(fa, en)` in `apps/mobile/src/screens/Home.tsx`; there is no separate translation table, and screens have no component-test setup.
