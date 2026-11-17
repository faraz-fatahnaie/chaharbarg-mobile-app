# Notes for the architect

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-001, 2026-11-15) Saved matches and settings from the old build are only fixed up on load (`loadMatch` and `load` in `store.ts`), so any new persisted target value needs the same migration.
- (F-005, 2026-11-16) this branch still has targets `62 | 100 | 'single'` and the sur cap, so any new code that takes a target must accept `number | 'single'`.
- (F-051, 2026-11-17) F-005's XP formula exists only on the `factory/F-005` branch, so this branch still uses the inline formula in `settleMatch` (`apps/mobile/src/economy/economy.ts`).
