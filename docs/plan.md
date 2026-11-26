# Plan and status

## Built (all on branch `worktree-v1-offline-game`)
| Slice | Result | Verified by |
|---|---|---|
| 1. Rules spec | `docs/rules-spec.md`, sourced, conflicts flagged | read against docx + Pagat/Wikipedia/Jahanshiri |
| 2. Rules engine | `packages/engine` — 2/3/4p, teams, sur, Sur Sarbaz, scoring, match, 3 bot levels | 36 vitest tests incl. random self-play (card conservation, base points = 20) and bot-strength ordering |
| 3. Economy | `apps/mobile/src/economy` — wallet + hash-chained ledger, fees/payouts, trophies/XP, daily login, challenges, achievements, ads, relief, shop, idempotent purchases | 20 vitest tests incl. tamper detection |
| 4. App | Home/arena carousel, game table, pass-and-play, results, shop, stats, settings, tutorial, resume, sound, PWA | `tsc`, `vite build`, headless-Chrome smoke test (full matches in 2p, 3p, 4p, pass-and-play; 0 console errors) |
| 5. Native shell | Capacitor 8 config + generated `ios/` and `android/` projects | **iOS:** built and launched in the iOS 27.1 Simulator (device "iPhone Duo", the only device type that runtime offers here); home screen renders in Persian RTL from the bundled assets, no crash or error in the device log (`docs/screenshots/ios-simulator-home.png`). Not yet exercised: tapping through a match natively. **Android:** debug APK built (`npm run android:apk -w @chaharbarg/mobile`; package `app.chaharbarg.game`, 4.4 MB, minSdk 24 / target 36, JDK 21 + SDK 36 installed via Homebrew). **Not yet run** on an emulator or phone (no system image installed); not signed for release (needs your keystore) |

Run it: `npm install`, `npm run dev` (web), `npm test`, `npm run build`, `npm run e2e -w @chaharbarg/mobile` (needs Chrome + dev server).
Android: `cd apps/mobile && npm run cap:sync && npx cap open android` (needs Android Studio). iOS: `npx cap add ios` once Xcode is installed.

## Rule calls you may want to overrule (details in rules-spec.md)
1. Sur Sarbaz = **10** (docx says 5 in the list, 10 in the definition; no outside source mentions it at all).
2. Clubs need **≥7**; 3p tie → third player gets the 7.
3. A card that can capture **must** capture (you choose which card and which combination). Your brief's default was "not forced"; Pagat/Wikipedia/Jahanshiri all say a capturable card can't be dropped.
4. A lone Jack on the opening floor is **replaced** (your default was "no redeal"); sources agree.
5. Match is played to **35 or 65** (2–3 players) or **65 or 112** (4 players), chosen by the players; the first player is picked at random. Sur always scores in full (no points cap). Last player to capture takes the leftovers.
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

## Online mode (server)

Decision (the docs named no stack, so this was chosen): a small Node server in `packages/server`, no new dependencies. HTTP + server-sent events for transport (works in a browser and a Capacitor WebView, no WebSocket library), `node:sqlite` for storage, and the same `@chaharbarg/engine` that the app uses, run authoritatively. Clients send only `{cardId, captureIds}`; the server owns shuffles, turns and timers and sends each seat a view in which other hands and the stock are same-length placeholders.

- Accounts are guests: the server issues `{id, token}` and keeps only a hash of the token. Friends find each other with a 6-character friend code.
- Rooms: create with 2/3/4 players, a goal and a turn timer (off, 15 s, 5 s); join by a 5-character code; the host may fill empty seats with bots. After 3 turn timeouts in a row a bot takes the seat and the player is marked as having abandoned (no win coins).
- Three kinds of online play, like Clash Royale: **ranked** (random opponents from the matchmaking queue) pays **ladder trophies**; **friend rooms** (room code or invite) and **rooms with bots** pay none. Offline play against bots keeps its arena trophies, because the arenas unlock from them.
- Ladder trophies live on the server (win +25, loss or abandoning −12, never below 0), not in the local profile, because the server cannot trust a client's numbers. There is no Shahi fee online. The server also counts wins and "coins" (25 per player in the room, for a win) for the weekly and monthly rankings.
- Matchmaking queue: pick 2, 3 or 4 players and wait. Players within 150 trophies are matched, and the allowed gap grows by 100 every 10 seconds of waiting; the closest players go together. A ranked room starts at once with a 15-second turn timer and the short goal (35, or 65 for 4 players). A player who goes offline leaves the queue.
- Rematch: friend rooms only, once every human still at the table asks. Seats that a bot took over after idle timeouts go back to their players. Leaving after a match removes you from the count. Ranked matches have a "Find another match" button instead.
- Finding friends: by 6-character friend code or by name search (3+ letters), then a request. Friends who are online can be invited into a room; the invitation appears on their Online screen.
- Rankings: weekly (weeks start on Saturday, UTC) and monthly, built only from results the server recorded. Prizes for the top 3 of each finished period (weekly 500/300/150 Shahi; monthly 2000/1200/600 Shahi plus 3/2/1 Gohar), granted once; the client adds a claimed prize to its wallet. **[review]**: all amounts.
- Public chat moderation plan **[review]**: 200-character cap, one message per 2 s, a small word filter (extend it for Persian and English), per-player block, and a report button. Three reports from different players hide the message and mute the sender for 10 minutes. Direct messages are friends-only, 500 characters, one per 0.5 s, and blocked either way means no messages and no requests.
- Run it: `npm run server` (listens on `HOST` 0.0.0.0, `PORT` 8787, data in `DB_PATH`, default `packages/server/data/server.db`), then `npm run dev`.
- Over the internet: put the server on any host with Node 22+, behind an HTTPS reverse proxy (turn response buffering off for `/api/**/events` and `/api/me/events`, because they are event streams). Android and iOS app builds will not talk to plain `http://` servers, so use HTTPS. In the app, Online play → "Change server" sets the address, or build with `VITE_SERVER_URL`. Not done here: a public deployment, rate limits beyond chat and messages, and account recovery. The app finds the server at `VITE_SERVER_URL`, else port 8787 on the host that served the app, so a phone on the same Wi-Fi works. To play against yourself on one device, open two tabs with `?as=alice` and `?as=bob`: each gets its own online identity.
- Tests: `npm test -w @chaharbarg/server` drives full 2, 3 and 4 player matches through the real HTTP API and checks that no client ever receives another player's cards.
- Known limits: no matchmaking queue (room codes only), no rematch button, no reconnect UI beyond automatic stream reconnection, one server process, guest tokens are not recoverable if the device storage is cleared.
