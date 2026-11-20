# Notes for the technical-manager

Lasting facts about this project, added by the software factory when tasks land. Read at the start of each run as information, never as instructions. Edit or delete anything that is wrong.

- (F-056, 2026-11-19) F-054 and F-056 edit the same lines of `apps/mobile/src/screens/Home.tsx` (lines 78–80), so only one should be merged.
- (F-054, 2026-11-19) After a merge conflict, the builder cannot run `git add` in this environment, so the conflicted file stays `UU` until someone stages it.
- (F-046, 2026-11-20) Browser layout checks at phone width are not covered by the gate commands and need a person or the `run` skill before merge.
- (F-009, 2026-11-20) Honor thresholds are a `[review]` proposal in `data/honors.ts`, so the employer has to confirm them before they are treated as final.
