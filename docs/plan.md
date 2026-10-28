# Plan and status

## Built (all on branch `worktree-v1-offline-game`)
| Slice | Result | Verified by |
|---|---|---|
| 1. Rules spec | `docs/rules-spec.md`, sourced, conflicts flagged | read against docx + Pagat/Wikipedia/Jahanshiri |
| 2. Rules engine | `packages/engine` — 2/3/4p, teams, sur, Sur Sarbaz, scoring, match, 3 bot levels | 36 vitest tests incl. random self-play (card conservation, base points = 20) and bot-strength ordering |
| 3. Economy | `apps/mobile/src/economy` — wallet + hash-chained ledger, fees/payouts, trophies/XP, daily login, challenges, achievements, ads, relief, shop, idempotent purchases | 20 vitest tests incl. tamper detection |
| 4. App | Home/arena carousel, game table, pass-and-play, results, shop, stats, settings, tutorial, resume, sound, PWA | `tsc`, `vite build`, headless-Chrome smoke test (full matches in 2p, 3p, 4p, pass-and-play; 0 console errors) |
| 5. Native shell | Capacitor 8 config + generated `ios/` and `android/` projects | **iOS:** built and launched in the iOS 27.1 Simulator (device "iPhone Duo", the only device type that runtime offers here); home screen renders in Persian RTL from the bundled assets, no crash or error in the device log (`docs/screenshots/ios-simulator-home.png`). Not yet exercised: tapping through a match natively. **Android:** project generated, **not built** (no JDK/Android SDK here) |

Run it: `npm install`, `npm run dev` (web), `npm test`, `npm run build`, `npm run e2e -w @chaharbarg/mobile` (needs Chrome + dev server).
Android: `cd apps/mobile && npm run cap:sync && npx cap open android` (needs Android Studio). iOS: `npx cap add ios` once Xcode is installed.

## Rule calls you may want to overrule (details in rules-spec.md)
1. Sur Sarbaz = **10** (docx says 5 in the list, 10 in the definition; no outside source mentions it at all).
2. Clubs need **≥7**; 3p tie → third player gets the 7.
3. A card that can capture **must** capture (you choose which card and which combination). Your brief's default was "not forced"; Pagat/Wikipedia/Jahanshiri all say a capturable card can't be dropped.
4. A lone Jack on the opening floor is **replaced** (your default was "no redeal"); sources agree.
5. Match is played to **62** (Pagat/Wikipedia/Jahanshiri) with the **50-point sur cap** on; both configurable. Last player to capture takes the leftovers.
6. Play direction counter-clockwise; dealer rotates.
7. "Last turn" (no sur) = the **last round** of the deal (your docx uses نوبت for rounds).
8. One capture group per play (no source allows several).
All are toggles or constants in `RulesConfig`.

## Next steps (suggested order)
1. Review on device; tune economy/bot levels after playtests.
2. Read Bazaar/Myket publisher policies (card games, virtual currency) — see research.md §5.
3. Android: build an APK; try `capacitor-poolakey`; otherwise write the native billing plugin. Tapsell adapter behind `AdProvider`.
4. iOS: `npx cap add ios`, run in the Simulator (Xcode install in progress on your side); PWA add-to-home-screen coach-mark.
5. Illustrated assets: Ganjifeh-style deck, avatar parts, arena art upgrade (current scenes are flat vector stand-ins).
6. Move log + seed for replays; save export/import.

## Known gaps
- No real ad/billing SDK; no APK/IPA built or tested on a physical device; no low-end device profiling.
- The tutorial is slides, not an interactive table.
- UI tests are an end-to-end smoke test only (random play); there are no component tests.
- `ui-ux-pro-max` / `claude-design` skills not installed; framework-specific skill search not run (I was told not to ask, and installing needs your OK).
- Graph: see `docs/graph/` (graphify output).
