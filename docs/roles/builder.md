# Notes for the builder

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-002, 2026-11-15) Docs-only features here are checked by grep for stale values (62, 100, single deal) in the changed files, plus the three gate commands.
- (F-001, 2026-11-15) `fixMatchTarget` and `rulesFrom` are tested in `apps/mobile/src/lib/match.test.ts`, and the engine tests are in `packages/engine/test/engine.test.ts`.
- (F-003, 2026-11-15) `npm run cap:sync -w @chaharbarg/mobile` needs a native toolchain and was not run in this task, so the generated Capacitor files are still unregistered for the local-notifications plugin.
- (F-003, 2026-11-15) `sound.ts` caches its AudioContext, so tests that stub `globalThis.window` must call `vi.resetModules()` and re-import the module in each case.
- (F-006, 2026-11-15) Tests in `apps/mobile/src/lib/*.test.ts` run in Node under vitest, so browser APIs must not run when a module loads; call `vi.resetModules()` before re-importing `store.ts` to simulate a restart.
- (F-039, 2026-11-15) `docs/runbook.md` and `docs/plan.md` mention the old cap in more places than the spec lists, so run the cap grep over all of `docs/` before you finish.
