# Backlog

The software factory's intake queue. `factory run` takes the top item under Ready.
Add ideas to Inbox and promote them to Ready; the factory moves items after that.

## Inbox
- [ ] F-004 [Employer #3, offline P2] Live in-game score panel top right: club count, points so far, sur count, total, for every player
- [ ] F-005 [Employer #14, offline P3] Rebalance levels (1 to unlimited, slow growth): XP for finishing, winning, big margin, sur; penalty for quitting. Deliver a written report of the XP formula to the user for 
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

## Ready
- [ ] F-039 Remove the 50-point sur cap completely (rule R16, the 'surCap' house-rule toggle in Settings, the engine setting, tests, and mentions in docs/rules-spec.md, docs/plan.md, README). Sur always scores in

## In progress

## Awaiting approval

## Blocked

## Done
- [x] F-002 Update docs/rules-spec.md and README to the new match targets (35/65, 65/112) and random first player
- [x] F-001 Change match targets to 35/65 (2-3 players) and 65/112 (4 players), chosen by players; pick the first player at random (docs/product/brief.md Decisions 5 and 6)
- [x] F-003 [Employer #1, offline P1] Settings screen: separate music and effects toggles, notifications toggle (local reminders only, no push service), contact support link, send feedback/suggestions
- [x] F-006 [Employer #7, offline P4] Local profile: change name and profile picture (separate from the avatar)
