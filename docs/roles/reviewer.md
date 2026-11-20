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
- (F-001, 2026-11-18) No automated test covers the Home target row, so it needs a manual check in the running app at 390×844 with 2, 3 and 4 players, in Persian and English.
- (F-050, 2026-11-18) The mobile app has no DOM testing library, so the Home and Settings confirmations are verified only by manual checks, not by tests.
- (F-002, 2026-11-18) `git diff MERGE_HEAD -- docs/rules-spec.md README.md` shows the branch's own change against main, which is the quickest way to check a docs merge.
- (F-054, 2026-11-19) Existing `economy.test.ts` forfeit tests cover the behaviour the Home copy describes; no test fails if that copy changes.
- (F-056, 2026-11-19) The forfeit-warning behaviour is covered by the `economy.test.ts` forfeit tests, not by any component test, because the mobile app has no component-test setup.
- (F-054, 2026-11-19) Games-challenge forfeit behaviour is tested in `apps/mobile/src/economy/economy.test.ts` (around lines 235–258), so copy-only changes there need no new tests.
- (F-035, 2026-11-19) Stubbed tests cannot show real browser memory use for image decoding, so a manual check in Settings with a picture over 24 MP and a normal one is needed.
- (F-035, 2026-11-20) The Settings screen and the Persian message wrapping are not covered by the gate commands, so they need a manual check on a device.
- (F-046, 2026-11-20) The mobile Vitest setup has no DOM, so layout fixes can only be checked in the browser through the CDP harness at `apps/mobile/e2e/cdp.mjs`.
