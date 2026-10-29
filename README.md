# چهاربرگ (Chaharbarg / Pasur)

An offline-first Persian card game for Android and iOS. Persian first (RTL, Persian digits, Jalali dates), English second.
Play Pasur against bots or pass-and-play on one device, in ten arenas built on Iranian historical sites. Everything is stored on the device: no accounts, no network calls.

| | |
|---|---|
| Game | Pasur / Chahar Barg / Haft Khaj / Yazdah, for 2, 3 or 4 players (teams of 2 in the 4-player game) |
| Stack | TypeScript, React 19, Vite, Capacitor 8 (iOS + Android shells) |
| Rules engine | `packages/engine`, pure TypeScript with no UI dependencies, reusable on a server later |
| Status | **v1, offline.** Verified by 56 unit tests and full-match UI smoke tests. Not yet run on a physical phone. See [Status](#status) |
| Branch | `worktree-v1-offline-game` (repo: `faraz-fatahnaie/chaharbarg-mobile-app`) |

## Contents
- [Quick start](#quick-start)
- [What is in the game](#what-is-in-the-game)
- [Repository layout](#repository-layout)
- [Commands](#commands)
- [Architecture in brief](#architecture-in-brief)
- [Rules in brief](#rules-in-brief)
- [Economy in brief](#economy-in-brief)
- [Testing](#testing)
- [Documentation map](#documentation-map)
- [Status](#status)
- [Known gaps and risks](#known-gaps-and-risks)

For setup, building, releasing and troubleshooting, use the **[Runbook](docs/runbook.md)**.

## Quick start

```sh
# Node 22 LTS recommended (Node 20.17+ also works). Node 26 pre-release prints engine warnings but works.
npm install
npm run dev          # http://localhost:5173  (add ?fast to the URL for instant bots)
npm test             # engine + economy tests
npm run build        # type-check + production bundle in apps/mobile/dist
```

Open http://localhost:5173 in a browser (phone-sized window recommended). Native builds:

```sh
npm run ios:sim -w @chaharbarg/mobile      # build + launch in the iOS Simulator (needs Xcode)
npm run android:apk -w @chaharbarg/mobile  # debug APK (needs JDK 21 + Android SDK 36)
```

## What is in the game

- **Modes:** 2, 3 and 4 players; against bots (3 difficulty levels) or pass-and-play with a hand-off screen.
- **Rules:** capture by summing to 11, Jack / Queen / King rules, Sur and Sur Sarbaz, clubs scoring, last-capturer takes the leftovers, match to 62 / 100 / single deal. House rules are in Settings.
- **10 arenas** (Persepolis, Si-o-se-pol, Naqsh-e Jahan, Yazd wind-towers, Chehel Sotoun, Eram Garden, Golestan Palace, Tabriz Bazaar, Chogha Zanbil, Arg-e Bam), each with an original vector landmark scene in day, dusk and night, its own table colours, ambient sound, bot pool, entry fee and trophy gate. Secular heritage sites only.
- **Economy:** Shahi (soft coin) and Gohar (premium, cosmetics only); trophies, XP and levels; daily login streak; three daily challenges; achievements; rewarded video (capped); a relief gift so nobody is locked out. No cash-out, no real-money stakes.
- **Customisation:** 3 decks (classic, large-index for accessibility, Ganjifeh-inspired), 4 card backs, 4 tables.
- **UX:** valid-capture hints, combination chips when several captures exist, big «سور!» banner, per-deal score breakdown, resume after closing the app, 6-slide tutorial, local stats, quick-chat stickers that bots answer.
- **Offline:** no network calls anywhere; installable PWA with a service worker; local persistence with a tamper-evident ledger.

## Repository layout

```
packages/engine/           pure TS rules engine + bots (no UI deps)
  src/cards.ts               cards, deck, seeded RNG (mulberry32), shuffle
  src/deal.ts                RulesConfig, DealState, captureOptions, legalMoves, play (the turn function)
  src/score.ts               scoreDeal (per player or per team)
  src/match.ts               newMatch / matchPlay / matchNextDeal (target score, deals)
  src/bot.ts                 chooseMove for easy / medium / hard
  test/                      36 tests (rules, scoring, self-play, bot strength)
apps/mobile/               the app
  src/screens/               Home, Game, Shop, Stats, Settings, Tutorial
  src/art/                   CardView (3 deck styles), Scene (10 arena landmarks)
  src/economy/               wallet + ledger, fees/payouts, rewards, shop (21 tests), sha256
  src/data/                  arenas, bots, cosmetics, achievements
  src/lib/                   store (persistence), i18n, sound, services (ad/store providers), match builder, autopilot (test hook)
  public/                    manifest, icon, service worker
  android/  ios/             generated Capacitor projects
  e2e/                       headless-Chrome drivers (no dependencies)
  scripts/                   ios-sim.sh, android-apk.sh
docs/                      rules-spec · research · features · design · plan · runbook · graph/ · screenshots/ · demo/
چهاربرگ.docx               (in the parent folder) the original rules document
```

## Commands

Run from the repository root unless noted. `-w @chaharbarg/mobile` runs a script in the app workspace.

| Command | What it does |
|---|---|
| `npm install` | install all workspaces |
| `npm run dev` | Vite dev server on port 5173, all interfaces |
| `npm test` | engine tests, then app tests |
| `npm run build` | type-check, then production build into `apps/mobile/dist` |
| `npm run typecheck -w @chaharbarg/mobile` | `tsc --noEmit` for the app |
| `npm run typecheck -w @chaharbarg/engine` | `tsc --noEmit` for the engine |
| `npm run preview -w @chaharbarg/mobile` | serve the production build |
| `npm run cap:sync -w @chaharbarg/mobile` | build web, then `cap sync` to both native projects |
| `npm run ios:sim -w @chaharbarg/mobile` | build, install and launch in the iOS Simulator |
| `npm run android:apk -w @chaharbarg/mobile` | build a debug APK |
| `npm run e2e -w @chaharbarg/mobile` | full-match smoke test in headless Chrome (needs the dev server running) |

## Architecture in brief

- **Engine** is a set of pure functions over plain JSON state (`DealState`, `MatchState`). `play(state, cardId, captureIds)` validates the move and returns the next state plus a result (captured cards, sur, round change). Because it has no side effects and no UI imports, a server can run the same module authoritatively for online play later.
- **App** keeps one profile object in `localStorage` (`useSyncExternalStore`, no state library). Every balance change goes through `applyDelta`, which appends a SHA-256 hash-chained ledger entry; on load, `verifyProfile` rolls back an edited balance. This stops casual editing only (the key ships in the bundle). Gohar can never be staked, so tampering has no cash value.
- **Services** (`lib/services.ts`): `AdProvider` and `StoreProvider` are interfaces with labelled mock implementations. Real Cafe Bazaar / Myket billing and an Iranian ad network plug in behind them.
- **Capacitor** wraps the same web build for iOS and Android. The web build doubles as the installable PWA.
- Design rationale and the framework comparison: [docs/design.md](docs/design.md).

## Rules in brief

Primary source: the project's `چهاربرگ.docx`; gaps filled from Pagat, Wikipedia and Jahanshiri. Full spec with every conflict and call: [docs/rules-spec.md](docs/rules-spec.md).

- A numeric card (A=1 … 10) captures floor cards that, with it, sum to **11**. A **Queen** takes a Queen, a **King** a King. A **Jack** takes every floor card except Queens and Kings (including other Jacks).
- A card that *can* capture must capture (you choose the card and the combination). A card with no capture is dropped on the floor.
- **Sur** = emptying the floor: 5 points; not with a Jack, not in the last round, not for a side with 50+ points. **Sur Sarbaz** = a lone Jack on the floor taken by the next player's Jack: 10 points.
- Deal scoring: 7 clubs or more = 7, each Ace and Jack = 1, 10♦ = 3, 2♣ = 2 (20 points per deal plus surs). A match runs to 62 points by default.
- Calls where I overrode your brief's defaults because all sources agreed are listed in [docs/plan.md](docs/plan.md).

## Economy in brief

Shahi pays arena entry (20 → 4000); a 2-player win pays 1.8× the fee (10% rake is the sink). Trophies gate arenas (+25 win, −12 loss). Gohar buys cosmetics only. Numbers, sources and sinks: [docs/design.md](docs/design.md) §3–4. All prices are placeholders to tune with playtests.

## Testing

| Layer | How | Count |
|---|---|---|
| Engine rules, scoring, bots | `npm test -w @chaharbarg/engine` (vitest) | 36 |
| Economy, ledger, tamper detection | `npm test -w @chaharbarg/mobile` (vitest) | 20 |
| UI, full matches (2p, 3p, 4p, pass-and-play) | `node e2e/cdp.mjs smoke` (headless Chrome) | scenario |
| Production bundle offline check | `node e2e/cdp.mjs offline` | scenario |
| Native iOS flow | autopilot build (see runbook §7) | scenario |

The engine tests include random self-play that asserts all 52 cards are conserved and that base points total exactly 20 per deal, and a bot-vs-bot test (medium beats easy ≈75%, hard beats medium ≈65%).

## Documentation map

| Document | Purpose |
|---|---|
| [docs/runbook.md](docs/runbook.md) | **setup, build, run, test, release, troubleshoot** |
| [docs/rules-spec.md](docs/rules-spec.md) | precise rules for every mode, with sources and test list |
| [docs/research.md](docs/research.md) | Iran-specific research: stores, payments, ads, sanctions, regulation (with confidence labels) |
| [docs/features.md](docs/features.md) | feature list, priorities (v1 / v2 / later), gaps found |
| [docs/design.md](docs/design.md) | flow, arenas, economy, offline architecture, framework decision |
| [docs/plan.md](docs/plan.md) | what is built, how it was verified, decisions to overrule, next steps |
| [docs/graph/](docs/graph/) | knowledge graph of docs and code (graphify) |
| [docs/screenshots/](docs/screenshots/), [docs/demo/](docs/demo/) | screenshots and an iOS Simulator run recording |

## Status

Built and verified: engine, economy, all screens, PWA, Capacitor iOS and Android projects, iOS Simulator launch, Android debug APK.
**Not done:** real ad and billing SDKs, release signing, testing on physical devices or an Android emulator, low-end device profiling, illustrated art assets (current art is original flat vector stand-ins), recorded music and sfx (sound is procedural).

## Known gaps and risks

- **Store policy unknown.** I could not find Cafe Bazaar's or Myket's actual policy on card games or virtual currency. Read their publisher rules before submitting. Some sources say many jurists consider playing cards impermissible; the game avoids gambling cues (no stakes in real money, no cash-out).
- **Iranian age rating (ESRA)** may apply to distribution; unverified for mobile.
- **iOS distribution in Iran** is realistically PWA or third-party stores, not the App Store. See [docs/research.md](docs/research.md).
- **Developer-tool reachability from inside Iran** (npm, Maven, Gradle, CocoaPods/SPM) is unverified.
- **Sur Sarbaz** exists only in your docx; value 10 is my call.
- Offline coins can be edited by a determined user; acceptable only because nothing has cash value.
