# Backlog

The software factory's intake queue. `factory run` takes the top item under Ready.
Add ideas to Inbox and promote them to Ready; the factory moves items after that.

## Inbox
- [ ] F-007 [Employer #4, offline P5] Avatar creator, shown on the left during play; leave room for later taunt moments. Depends on avatar art (plan: v2)
- [ ] F-008 [Employer #2 offline half, offline P6] Staged solo mode from beginner to advanced with guided tutorial and a coin prize per stage; reuse arenas and bot levels
- [ ] F-009 [Employer #12, offline P7] More trophies and titles from level, wins and sur counts (non-cash)
- [ ] F-010 [Employer #11 offline part, offline P8] Stats split by 2, 3 and 4 player games: games, wins, win percent, sur count
- [ ] F-011 [Employer #5, offline P9] Quick-chat messages during play: polish the existing bot sticker chat; online delivery later
- [ ] F-012 [Employer #8, offline-capable, P10] Optional turn timer, normal 15s / speed 5s. On timeout auto-drop: first a card that captures nothing, else the best card; auto-capture if a capture exists. 3 timeou
- [ ] F-013 [Employer #2 online half, NEEDS SERVER, do not promote] Online play for 2, 3 and 4 players
- [ ] F-014 [Employer #6, NEEDS SERVER, do not promote] Friend requests: send, accept, reject, remove, block
- [ ] F-015 [Employer #15, NEEDS SERVER, do not promote] Friends list with a chat button per friend
- [ ] F-016 [Employer #9, NEEDS SERVER, do not promote] Public text chat room (needs moderation plan)
- [ ] F-017 [Employer #10, NEEDS SERVER, do not promote] Weekly and monthly rankings by wins and coins won
- [ ] F-018 [Employer #13, NEEDS SERVER, do not promote] Prize announcement at app start and weekly/monthly winner prizes
- [ ] F-019 `docs/plan.md` line 20 still says the match is played to 62, and line 21 doesn't mention the random first player. Update both.
- [ ] F-020 `docs/features.md` line 8 still says "match to 62/100/single deal".
- [ ] F-021 Once F-001 lands, check its target choices (single deal kept or dropped, any default) against these docs.
- [ ] F-022 R16's 50-point sur cap can never apply in a 35-point match. Ask the employer whether it should scale with the target.
- [ ] F-023 `docs/plan.md` line 20 still says the match is played to 62, and line 21 doesn't mention the random first player.
- [ ] F-024 `docs/features.md` line 8 still says "match to 62/100/single deal".
- [ ] F-025 When F-001 lands, check that its target choices match these docs: whether it keeps or drops the single-deal option, and any default target it sets.
- [ ] F-026 R16's 50-point sur cap can never apply in a 35-point match. Ask the employer whether the cap should change with the target.
- [ ] F-027 Check the Home Goal row in the running app: the 2–3 player and 4 player labels, and that the highlighted button follows the saved choice when the player count changes.
- [ ] F-028 Run `npm run cap:sync -w @chaharbarg/mobile` so the local-notifications plugin is registered in the Android and iOS projects. Check that the diff only adds this plugin. Then test the daily reminder on
- [ ] F-029 After the sync, add `tools:node="remove"` for `SCHEDULE_EXACT_ALARM` in the Android manifest. The reminder no longer uses exact alarms, and Google Play may reject an app that asks for the permission w
- [ ] F-030 The new Notifications panel and the Contact support / Send feedback links have no automated tests. Check them in the running app.
- [ ] F-031 After `cap sync` registers `@capacitor/local-notifications`, remove the merged `SCHEDULE_EXACT_ALARM` permission from the Android manifest with `tools:node="remove"`. Reminders are no longer exact, an
- [ ] F-032 Run `npm run cap:sync -w @chaharbarg/mobile` to register the local-notifications plugin in the Android and iOS projects, then test the daily reminder on a real device.
- [ ] F-033 After the sync, remove the `SCHEDULE_EXACT_ALARM` permission from the Android manifest with `tools:node="remove"`.
- [ ] F-034 No automated test covers the new Notifications panel or the Contact support and Send feedback links, so check them in the running app.
- [ ] F-035 Check the picture's pixel size (or shrink it while opening it) in `readPhoto`, so a huge image can't use up memory and crash the app.
- [ ] F-036 Free the canvas in `readPhoto` after `toDataURL` (`canvas.width = canvas.height = 0`) to stay under the iOS canvas memory limit.
- [ ] F-037 In `readPhoto`, reject or shrink pictures with a very large pixel count before fully opening them (for example, check `naturalWidth * naturalHeight`, or use `createImageBitmap` with a resize). A very 
- [ ] F-038 In `readPhoto`, free the canvas after `toDataURL` (`canvas.width = canvas.height = 0` in a `finally`), to stay under iOS's limit on canvas memory.
- [ ] F-040 Close F-022 and F-026, which are moot now.
- [ ] F-041 Rebuild `docs/graph/graph.json` (`graphify update .`) after this lands; it still has R16 and `surCap` nodes.
- [ ] F-042 Check whether F-001's 35/65/112 targets reached this branch. The code and README here still use 62/100/single.
- [ ] F-043 Rebuild `docs/graph/graph.json` (`graphify update .`) after this lands, because it still has R16 and `surCap` nodes.
- [ ] F-044 Close F-022 and F-026, which no longer apply.
- [ ] F-045 Run the spec's phone-viewport check (2p, 3p and 4p, in fa and en). Look for overlap with the floor cards, the `pos-tr`, `pos-top` and `pos-right` seats, and the turn glow.
- [ ] F-046 During that check, confirm long 3p names are cut off with "…" in `.live td.nm` (`apps/mobile/src/styles.css:129`). If they aren't, put the name in a `<span>` with `display:block; max-width:72px; overf
- [ ] F-047 Run the spec's phone-viewport check (2p, 3p and 4p, in fa and en) and confirm long 3p names in `.live td.nm` end in "…".
- [ ] F-048 Have a person confirm that "Total" means this deal's total so far, not the match score (the spec's open question).
- [ ] F-053 When `factory/F-005` merges, keep its `quit?: boolean` and `quit: true`, and keep `games: m.quit ? 0 : 1` in `settleMatch`.
- [ ] F-054 F-050's forfeit warning could also say that a forfeit doesn't count toward the daily games challenge.
- [ ] F-055 When `factory/F-005` merges, keep its `quit?: boolean` and `quit: true`, and keep this branch's `games: m.quit ? 0 : 1` in `settleMatch`.
- [ ] F-056 F-050's forfeit warning could also say that a forfeit doesn't count toward the daily games challenge.
- [ ] F-057 The project notes from F-005 say the mobile suite had 27 tests, but it now runs 20. This change did not touch any test file, so the drop happened before this run. Someone should check whether tests in
  Depends on: F-052
  Found while building F-052.
- [ ] F-058 When F-005 merges with F-051, apply `xpShare` inside `matchXp` to non-forfeit XP only, and add the `XP_SINGLE_SHARE` row and rule to `docs/xp-levels.md` using the text above.
  Depends on: F-051
  Found while building F-051.
- [ ] F-059 Product owner to confirm the single-deal XP share (0.2 proposed, marked [review] in `docs/design.md`).
  Depends on: F-051
  Found while building F-051.
- [ ] F-060 Manual check: the result screen should show the scaled `xpGain` after a single-deal match. The gate commands do not cover the result screen.
  Depends on: F-051
  Found while building F-051.

## Ready

## In progress

## Awaiting approval
- [ ] F-051 Single-deal matches are the fastest way to earn XP (found in F-005 review). Check whether XP for single deals should be reduced.
  Added in conversation.

## Blocked
- [ ] F-050 The Forfeit button does not warn the player about the -40 XP penalty (found in F-005 review).
  Added in conversation.

## Done
- [x] F-002 Update docs/rules-spec.md and README to the new match targets (35/65, 65/112) and random first player
- [x] F-001 Change match targets to 35/65 (2-3 players) and 65/112 (4 players), chosen by players; pick the first player at random (docs/product/brief.md Decisions 5 and 6)
- [x] F-003 [Employer #1, offline P1] Settings screen: separate music and effects toggles, notifications toggle (local reminders only, no push service), contact support link, send feedback/suggestions
- [x] F-006 [Employer #7, offline P4] Local profile: change name and profile picture (separate from the avatar)
- [x] F-039 Remove the 50-point sur cap completely (rule R16, the 'surCap' house-rule toggle in Settings, the engine setting, tests, and mentions in docs/rules-spec.md, docs/plan.md, README). Sur always scores in
- [x] F-004 [Employer #3, offline P2] Live in-game score panel top right: club count, points so far, sur count, total, for every player
- [x] F-005 [Employer #14, offline P3] Rebalance levels (1 to unlimited, slow growth): XP for finishing, winning, big margin, sur; penalty for quitting. Deliver a written report of the XP formula to the user for 
- [x] F-049 A forfeit still counts toward the daily 'play N games' challenge (found in F-005 review). Decide whether it should.
  Added in conversation.
- [x] F-052 The result screen hardcodes 'levelUps * 2' Gohar instead of using LEVEL_GOHAR (found in F-005 review).
  Added in conversation.
