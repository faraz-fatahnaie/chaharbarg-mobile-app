# Notes for the reviewer

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-002, 2026-11-15) `docs/plan.md` and `docs/features.md` still carry the old 62/100/single-deal wording and are outside this task's scope, so check them when a docs change touches the match rules.
- (F-001, 2026-11-15) The Home target row is not covered by any automated test, so check it in the running app, since the gate commands do not exercise it.
- (F-003, 2026-11-15) `@capacitor/local-notifications` 8.3 defaults `isExactNotification` to true, which opens the Android "Alarms & reminders" screen, so the reminder sets it to false.
- (F-006, 2026-11-15) The gate commands do not cover the file picker, iOS camera permission or header visuals, so those need a device check.
- (F-039, 2026-11-15) The gates do not open the Settings screen, so the removed toggle and the layout of the remaining toggles need a device check.
- (F-004, 2026-11-15) The phone-viewport check (390×844, 2p/3p/4p, fa and en) is manual and not covered by the gates, so it must be done by hand before merge.
- (F-005, 2026-11-16) `npm test` runs both the engine and mobile suites (36 and 27 tests), and the economy tests live in `apps/mobile/src/economy/economy.test.ts`.
- (F-049, 2026-11-16) Gate commands are `npm test`, `npm run typecheck -w @chaharbarg/engine` and `npm run typecheck -w @chaharbarg/mobile`; the challenge logic lives in `apps/mobile/src/economy/economy.ts` and its tests in `economy.test.ts`.
- (F-052, 2026-11-17) The mobile suite was recorded as 27 tests in earlier notes but runs 20 now, so check the test count against `apps/mobile/src/economy/economy.test.ts` before trusting old totals.
- (F-051, 2026-11-17) The simulation's "unscaled" XP divides the already-rounded scaled XP by 0.2, so each per-match figure can be off by about ±2.5 XP; the assertions still hold because the margins are much larger.
