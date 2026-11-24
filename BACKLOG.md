# Backlog

The software factory's intake queue. `factory run` takes the top item under Ready.
Add ideas to Inbox and promote them to Ready; the factory moves items after that.

## Inbox
- [ ] F-007 [Employer #4, offline P5] Avatar creator, shown on the left during play; leave room for later taunt moments. Depends on avatar art (plan: v2)
- [ ] F-011 [Employer #5, offline P9] Quick-chat messages during play: polish the existing bot sticker chat; online delivery later
- [ ] F-013 [Employer #2 online half, NEEDS SERVER, do not promote] Online play for 2, 3 and 4 players
- [ ] F-014 [Employer #6, NEEDS SERVER, do not promote] Friend requests: send, accept, reject, remove, block
- [ ] F-015 [Employer #15, NEEDS SERVER, do not promote] Friends list with a chat button per friend
- [ ] F-016 [Employer #9, NEEDS SERVER, do not promote] Public text chat room (needs moderation plan)
- [ ] F-017 [Employer #10, NEEDS SERVER, do not promote] Weekly and monthly rankings by wins and coins won
- [ ] F-018 [Employer #13, NEEDS SERVER, do not promote] Prize announcement at app start and weekly/monthly winner prizes
- [ ] F-027 Check the Home Goal row in the running app: the 2–3 player and 4 player labels, and that the highlighted button follows the saved choice when the player count changes.
- [ ] F-028 Run `npm run cap:sync -w @chaharbarg/mobile` so the local-notifications plugin is registered in the Android and iOS projects. Check that the diff only adds this plugin. Then test the daily reminder on
- [ ] F-029 After the sync, add `tools:node="remove"` for `SCHEDULE_EXACT_ALARM` in the Android manifest. The reminder no longer uses exact alarms, and Google Play may reject an app that asks for the permission w
- [ ] F-030 The new Notifications panel and the Contact support / Send feedback links have no automated tests. Check them in the running app.
- [ ] F-041 Rebuild `docs/graph/graph.json` (`graphify update .`) after this lands; it still has R16 and `surCap` nodes.
- [ ] F-045 Run the spec's phone-viewport check (2p, 3p and 4p, in fa and en). Look for overlap with the floor cards, the `pos-tr`, `pos-top` and `pos-right` seats, and the turn glow.
- [ ] F-068 Add focus handling and a screen-reader announcement to the inline confirmations in Home (forfeit) and Settings (erase all data).
  Depends on: F-050
  Found while building F-050.
- [ ] F-081 Let the player pick a title from their unlocked honors. This needs a stored `title` field, checked on load in `store.ts`.
  Depends on: F-009
  Found while building F-009.

## Ready

## In progress
- [ ] F-010 [Employer #11 offline part, offline P8] Stats split by 2, 3 and 4 player games: games, wins, win percent, sur count

## Awaiting approval

## Blocked

## Done
- [x] F-006 [Employer #7, offline P4] Local profile: change name and profile picture (separate from the avatar)
- [x] F-039 Remove the 50-point sur cap completely (rule R16, the 'surCap' house-rule toggle in Settings, the engine setting, tests, and mentions in docs/rules-spec.md, docs/plan.md, README). Sur always scores in
- [x] F-005 [Employer #14, offline P3] Rebalance levels (1 to unlimited, slow growth): XP for finishing, winning, big margin, sur; penalty for quitting. Deliver a written report of the XP formula to the user for 
- [x] F-049 A forfeit still counts toward the daily 'play N games' challenge (found in F-005 review). Decide whether it should.
  Added in conversation.
- [x] F-052 The result screen hardcodes 'levelUps * 2' Gohar instead of using LEVEL_GOHAR (found in F-005 review).
  Added in conversation.
- [x] F-051 Single-deal matches are the fastest way to earn XP (found in F-005 review). Check whether XP for single deals should be reduced.
  Added in conversation.
- [x] F-003 [Employer #1, offline P1] Settings screen: separate music and effects toggles, notifications toggle (local reminders only, no push service), contact support link, send feedback/suggestions
- [x] F-004 [Employer #3, offline P2] Live in-game score panel top right: club count, points so far, sur count, total, for every player
- [x] F-001 Change match targets to 35/65 (2-3 players) and 65/112 (4 players), chosen by players; pick the first player at random (docs/product/brief.md Decisions 5 and 6)
- [x] F-050 The Forfeit button does not warn the player about the -40 XP penalty (found in F-005 review).
  Added in conversation.
- [x] F-002 Update docs/rules-spec.md and README to the new match targets (35/65, 65/112) and random first player
- [x] F-056 F-050's forfeit warning could also say that a forfeit doesn't count toward the daily games challenge.
- [x] F-054 F-050's forfeit warning could also say that a forfeit doesn't count toward the daily games challenge.
- [x] F-035 Check the picture's pixel size (or shrink it while opening it) in `readPhoto`, so a huge image can't use up memory and crash the app.
- [x] F-046 During that check, confirm long 3p names are cut off with "…" in `.live td.nm` (`apps/mobile/src/styles.css:129`). If they aren't, put the name in a `<span>` with `display:block; max-width:72px; overf
- [x] F-008 [Employer #2 offline half, offline P6] Staged solo mode from beginner to advanced with guided tutorial and a coin prize per stage; reuse arenas and bot levels (split into F-088, F-089, F-090, F-091, F-092)
- [x] F-009 [Employer #12, offline P7] More trophies and titles from level, wins and sur counts (non-cash)
- [x] F-022 R16's 50-point sur cap can never apply in a 35-point match. Ask the employer whether it should scale with the target. (closed: moot: F-039 removed the 50-point sur cap)
- [x] F-026 R16's 50-point sur cap can never apply in a 35-point match. Ask the employer whether the cap should change with the target. (closed: moot: F-039 removed the 50-point sur cap)
- [x] F-040 Close F-022 and F-026, which are moot now. (closed: moot: F-039 removed the 50-point sur cap)
- [x] F-044 Close F-022 and F-026, which no longer apply. (closed: moot: F-039 removed the 50-point sur cap)
- [x] F-019 `docs/plan.md` line 20 still says the match is played to 62, and line 21 doesn't mention the random first player. Update both. (closed: fixed in docs)
- [x] F-020 `docs/features.md` line 8 still says "match to 62/100/single deal". (closed: fixed in docs)
- [x] F-021 Once F-001 lands, check its target choices (single deal kept or dropped, any default) against these docs. (closed: moot: F-001/F-002 landed, code and docs use 35/65/112)
- [x] F-023 `docs/plan.md` line 20 still says the match is played to 62, and line 21 doesn't mention the random first player. (closed: duplicate of an earlier item)
- [x] F-024 `docs/features.md` line 8 still says "match to 62/100/single deal". (closed: duplicate of an earlier item)
- [x] F-025 When F-001 lands, check that its target choices match these docs: whether it keeps or drops the single-deal option, and any default target it sets. (closed: moot: F-001/F-002 landed, code and docs use 35/65/112)
- [x] F-031 After `cap sync` registers `@capacitor/local-notifications`, remove the merged `SCHEDULE_EXACT_ALARM` permission from the Android manifest with `tools:node="remove"`. Reminders are no longer exact, an (closed: duplicate of an earlier item)
- [x] F-032 Run `npm run cap:sync -w @chaharbarg/mobile` to register the local-notifications plugin in the Android and iOS projects, then test the daily reminder on a real device. (closed: duplicate of an earlier item)
- [x] F-033 After the sync, remove the `SCHEDULE_EXACT_ALARM` permission from the Android manifest with `tools:node="remove"`. (closed: duplicate of an earlier item)
- [x] F-034 No automated test covers the new Notifications panel or the Contact support and Send feedback links, so check them in the running app. (closed: duplicate of an earlier item)
- [x] F-036 Free the canvas in `readPhoto` after `toDataURL` (`canvas.width = canvas.height = 0`) to stay under the iOS canvas memory limit. (closed: done: photo canvas freed after toDataURL)
- [x] F-037 In `readPhoto`, reject or shrink pictures with a very large pixel count before fully opening them (for example, check `naturalWidth * naturalHeight`, or use `createImageBitmap` with a resize). A very  (closed: duplicate of an earlier item)
- [x] F-038 In `readPhoto`, free the canvas after `toDataURL` (`canvas.width = canvas.height = 0` in a `finally`), to stay under iOS's limit on canvas memory. (closed: done: photo canvas freed after toDataURL)
- [x] F-042 Check whether F-001's 35/65/112 targets reached this branch. The code and README here still use 62/100/single. (closed: moot: F-001/F-002 landed, code and docs use 35/65/112)
- [x] F-043 Rebuild `docs/graph/graph.json` (`graphify update .`) after this lands, because it still has R16 and `surCap` nodes. (closed: duplicate of an earlier item)
- [x] F-047 Run the spec's phone-viewport check (2p, 3p and 4p, in fa and en) and confirm long 3p names in `.live td.nm` end in "…". (closed: duplicate of an earlier item)
- [x] F-048 Have a person confirm that "Total" means this deal's total so far, not the match score (the spec's open question). (closed: decided: Total is this deal's total so far, as built)
- [x] F-053 When `factory/F-005` merges, keep its `quit?: boolean` and `quit: true`, and keep `games: m.quit ? 0 : 1` in `settleMatch`. (closed: already in code: quit flag and games: m.quit ? 0 : 1)
- [x] F-055 When `factory/F-005` merges, keep its `quit?: boolean` and `quit: true`, and keep this branch's `games: m.quit ? 0 : 1` in `settleMatch`. (closed: already in code: quit flag and games: m.quit ? 0 : 1)
- [x] F-057 The project notes from F-005 say the mobile suite had 27 tests, but it now runs 20. This change did not touch any test file, so the drop happened before this run. Someone should check whether tests in (closed: moot)
- [x] F-058 When F-005 merges with F-051, apply `xpShare` inside `matchXp` to non-forfeit XP only, and add the `XP_SINGLE_SHARE` row and rule to `docs/xp-levels.md` using the text above. (closed: done: single-deal XP removed)
- [x] F-059 Product owner to confirm the single-deal XP share (0.2 proposed, marked [review] in `docs/design.md`). (closed: done: single-deal XP removed)
- [x] F-060 Manual check: the result screen should show the scaled `xpGain` after a single-deal match. The gate commands do not cover the result screen. (closed: moot)
- [x] F-061 `xpShare`, `XP_SINGLE_SHARE` and `bigMarginAt` in `economy.ts` still handle `'single'` and numeric targets, which main's engine can't produce now. The XP value of the new short and long targets (35, 6 (closed: done: single-deal XP removed)
- [x] F-062 Check every field of saved settings against its allowed values in `migrateSettings`: `openingJack`, `mustCapture`, `noSurInLastRound`, `surSarbazPoints`, `timeOfDay`, `lang`, `hints`. (closed: done: validation and test added)
- [x] F-063 Check the shape of a saved match in `loadMatch` before resuming it, not just rely on the `try/catch`. (closed: done: validation and test added)
- [x] F-064 Set XP pay for the short and long targets (35/65 and 65/112). Short matches now earn about 1.3–1.7× more XP per deal than long ones, which partly undoes F-051. Then bring back an XP-per-deal guard in  (closed: decided: accepted, long matches pay more per match (about 47 vs 41 XP at 3p))
- [x] F-065 Run `git add docs/rules-spec.md` (or have the orchestrator stage it) so the merge of main into the F-002 branch can be finished; the file is still marked unmerged (`UU`). (closed: moot: F-001/F-002 landed, code and docs use 35/65/112)
- [x] F-066 Make the match-target code match the docs: replace 62, 100 and `'single'` with 35/65 for 2–3 players and 65/112 for 4 players in `deal.ts`, `economy.ts`, `Settings.tsx`, `Game.tsx` and `autopilot.ts`. (closed: moot: F-001/F-002 landed, code and docs use 35/65/112)
- [x] F-067 Decide whether the F-051 single-deal XP rule (`XP_SINGLE_SHARE`, and the single-deal row in `docs/xp-levels.md`) still applies if single deal is removed. (closed: done: single-deal XP removed)
- [x] F-070 F-056 duplicates F-054, so a person should close it now that F-054 is done. (closed: duplicate of an earlier item)
- [x] F-071 F-056 duplicates F-054. A person should close it once F-054 lands. (closed: duplicate of an earlier item)
- [x] F-072 Close either F-054 or F-056 as a duplicate before merging, since both change `Home.tsx` lines 78–80 in the same way. (closed: duplicate of an earlier item)
- [x] F-073 Close either F-054 or F-056 as a duplicate before merging, since both change `Home.tsx` lines 78–80 in the same way. (closed: duplicate of an earlier item)
- [x] F-074 Close the duplicate-tracking items F-070, F-071, F-072 and F-073 in the backlog once F-054 lands, since F-056 is already merged on main and this merge has settled the wording. (closed: duplicate of an earlier item)
- [x] F-075 F-037 asks for the same pixel limit and can be closed as a duplicate of F-035. (closed: duplicate of an earlier item)
- [x] F-076 F-037 asks for the same pixel limit and can be closed as a duplicate of F-035. (closed: duplicate of an earlier item)
- [x] F-077 F-047 duplicates F-046, so close it once this lands. (closed: duplicate of an earlier item)
- [x] F-078 The `BACKLOG.md` text for F-046 stops mid-word after "overf" and needs fixing. (closed: moot)
- [x] F-079 F-047 duplicates F-046, so close it once this lands. (closed: duplicate of an earlier item)
- [x] F-080 The `BACKLOG.md` text for F-046 stops mid-word after "overf" and needs fixing. (closed: moot)
- [x] F-083 The employer should confirm the `[review]` thresholds and the fa names. (closed: decided: [review] honor thresholds and fa names accepted)
- [x] F-084 Make the level boundary test in `economy.test.ts` use `xpForLevel(at) - 1` for the locked case, as spec test 1 says. (closed: done: validation and test added)
- [x] F-085 Let the player pick a title from the unlocked honors (needs a stored `title` field, checked on load in `store.ts`). (closed: duplicate of F-081 / F-082)
- [x] F-086 Announce newly reached honors on the match-end screen in `Game.tsx`. (closed: duplicate of F-081 / F-082)
- [x] F-087 The person should confirm the `[review]` thresholds and the Persian names. (closed: decided: [review] honor thresholds and fa names accepted)
- [x] F-089 Staged solo mode from beginner to advanced with guided tutorial and a (part 2: Stage prize and unlock logic) (closed: built: see commits on worktree-v1-offline-game)
- [x] F-090 Staged solo mode from beginner to advanced with guided tutorial and a (part 3: Stage select screen) (closed: built: see commits on worktree-v1-offline-game)
- [x] F-091 Staged solo mode from beginner to advanced with guided tutorial and a (part 4: Stage result and prize) (closed: built: see commits on worktree-v1-offline-game)
- [x] F-092 Staged solo mode from beginner to advanced with guided tutorial and a (part 5: Guided tutorial) (closed: built: see commits on worktree-v1-offline-game)
- [x] F-012 [Employer #8, offline-capable, P10] Optional turn timer, normal 15s / speed 5s. On timeout auto-drop: first a card that captures nothing, else the best card; auto-capture if a capture exists. 3 timeouts in a row forfeit the match. (closed: built: see commits on worktree-v1-offline-game)
- [x] F-088 Staged solo mode from beginner to advanced with guided tutorial and a (part 1: Stage data and progress) (closed: built: see commits on worktree-v1-offline-game)
- [x] F-093 Quits still count as played games in the all-player totals (`games`, `losses`, `streak`). A person should decide whether those should match the groups. (closed: decided: quits count as played games everywhere, a forfeit is a loss)
- [x] F-095 Quits still count as played games in the all-player totals (`games`, `losses`, `streak`), unlike daily challenges and the player-count groups. A person should decide whether those should match. (closed: decided: quits count as played games everywhere, a forfeit is a loss)
- [x] F-094 A save with no `stats` object at all still loads with no `games`/`wins` fields, so `Stats.tsx` would show undefined values. (closed: done: stats default on load)
- [x] F-096 A save with no `stats` object at all loads without `games`/`wins` fields, so `Stats.tsx` would show undefined values. (closed: done: stats default on load)
- [x] F-069 `Game.tsx` line 383 would show `+-N XP` if a negative XP result ever reached that screen (the spec already lists this). (closed: done: XP gain shows a sign only when positive)
- [x] F-082 Announce newly reached honors on the match-end screen in `Game.tsx`. (closed: done: new honors announced on the result screen)
