# Notes for the reviewer

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-002, 2026-11-15) `docs/plan.md` and `docs/features.md` still carry the old 62/100/single-deal wording and are outside this task's scope, so check them when a docs change touches the match rules.
- (F-001, 2026-11-15) The Home target row is not covered by any automated test, so check it in the running app, since the gate commands do not exercise it.
- (F-003, 2026-11-15) `@capacitor/local-notifications` 8.3 defaults `isExactNotification` to true, which opens the Android "Alarms & reminders" screen, so the reminder sets it to false.
- (F-006, 2026-11-15) The gate commands do not cover the file picker, iOS camera permission or header visuals, so those need a device check.
- (F-039, 2026-11-15) The gates do not open the Settings screen, so the removed toggle and the layout of the remaining toggles need a device check.
