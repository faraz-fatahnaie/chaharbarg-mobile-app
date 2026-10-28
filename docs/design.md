# Chaharbarg — Design

Status: v1 built on branch `worktree-v1-offline-game`; decisions marked **[review]** are mine and open to change.

## 1. Principles and anti-goals
Persian first · offline first · rules match your docx and validated sources (see `rules-spec.md`) · no real-money gambling or cash-out · no dark patterns (no energy timers, no ads mid-hand, no loot boxes, daily ad cap, a relief gift so nobody is locked out) · original art only · engine separate from UI.

## 2. Flow and screens (all built)
```
Home ─┬─ arena carousel (10) ── players 2/3/4 · bots | pass&play ── [Play]
      ├─ daily reward · 3 challenges · rewarded video · relief gift
      ├─ resume banner (match in progress)
      └─ tabs: Shop · Stats · Settings        (Tutorial from Home/Settings)
Game ─ HUD (scores, goal, deal/round) · bots around the felt · floor · my hand
     ─ tap card → hint glow → [capture]/[drop] or pick a combination chip
     ─ banner «سور!» · deal summary table · match result (+ rewarded 50% bonus)
```
Layout: portrait only, 390×844 reference, RTL, bottom tab bar, thumb-reachable actions above the hand.

## 3. Arena system
Each arena = place (landmark SVG scene + 3 times of day: day 06–17, dusk 17–20, night; or fixed in Settings), table colours, ambient bed, bot pool, entry fee, trophy gate.

| # | Arena | Trophies | Fee (Shahi) | Bots |
|---|---|---|---|---|
| 1 | تخت جمشید | 0 | 20 | easy |
| 2 | سی‌وسه‌پل | 100 | 50 | easy |
| 3 | نقش جهان | 250 | 100 | medium |
| 4 | یزد (بادگیرها) | 450 | 200 | medium |
| 5 | چهل‌ستون | 700 | 350 | medium |
| 6 | باغ ارم | 1000 | 600 | hard |
| 7 | کاخ گلستان | 1400 | 1000 | hard |
| 8 | بازار تبریز | 1900 | 1600 | hard |
| 9 | چغازنبیل | 2500 | 2500 | hard |
| 10 | ارگ بم | 3200 | 4000 | hard |

Progression: win +25 trophies, loss −12 (floor 0); XP 20 + 30 for a win + 5 per sur; level-up = 2 Gohar. Arenas stay unlocked once reached unless trophies fall below the gate (then locked until regained — Clash-style). **[review]** I used trophies as the only gate; the brief's "levelling up" is a reward channel, not a gate.
Pot: every player pays the fee; a 2p win pays 1.8× (3p 2.7×, 4p each winner 1.8×); draw refunds; the 10% rake is the sink.
Improvements to the candidate list (v2 arenas): Khaju Bridge, Hasht Behesht, Shushtar water-mills, Abyaneh village, Falak-ol-Aflak castle. Avoided: mosques, shrines, and tombs.
Night scenes use window glows; day/dusk palettes are in `src/art/Scene.tsx`.

## 4. Economy
- **Shahi (شاهی)** soft: sources — match prizes, daily login (40→200, day 7 +3 Gohar), challenges (60–160), rewarded video (+60, 2-min cooldown, 8/day), relief (+100 when <20 Shahi, every 3 h); sinks — arena fees, 10% rake. Never purchasable directly, never cashable.
- **Gohar (گوهر)** premium: sources — packs (20/60/150), level-ups, achievements, day-7 login; sinks — cosmetics only. **Can never be staked or used for fees**, so real money cannot flow into match stakes. **[review]** Name keeps "Shahi/Gohar"; "Toman" avoided as a game currency.
- **Ads:** only on Home and Result; user-initiated; mock provider now; adapter slot for Tapsell/Adivery.
- **Purchases:** `StoreProvider` (purchase, restore). Tokens are stored; `grantPurchase` is idempotent, so restore/replay never double-grants. Real build must verify the store's RSA signature (Poolakey/Myket) before calling it.
- **Tamper model:** every balance change appends a SHA-256 chained ledger entry holding the resulting balances; on load a mismatch rolls back to the last valid entry and shows a notice. Honest limits: the key ships in the bundle, so this stops casual edits only. Because nothing has cash value, v1 accepts that; server-side verification arrives with online play.
- **Prices** (Toman 29k/79k/169k) are placeholders to validate with real store pricing. Tuning needs playtests.

## 5. Offline architecture
```
packages/engine  (pure TS, zero deps)   cards · deal · score · match · bots   ← reusable on a server
apps/mobile      (React 19 + Vite)      screens · art · economy · lib/store   ← localStorage
                 Capacitor 8 shell      android/ (generated)  ios/ (after Xcode)
```
- Engine state is plain JSON; `play()` and `matchPlay()` are pure and validated, so a server can run the same module authoritatively. Online later = send `Move {cardId, captureIds}`, replay from a seed.
- Persistence: `chaharbarg.profile.v1` (profile + ledger) and `chaharbarg.match.v1` (resumable match) in localStorage. **[review]** For v2 move to SQLite via Capacitor if saves grow; localStorage is enough for this data size. WebView storage can be cleared by the OS under pressure — v2: export/import save code.
- No network calls anywhere. Service worker caches the shell for PWA use.
- Not yet stored: RNG seed/move log (needed for replays).

## 6. Data model (see `economy.ts`)
`Profile {name, shahi, gohar, trophies, xp, stats, owned, equipped, settings, login, daily, ads, achievements, purchases, ledger[40], tampered}` · `MatchCtx {match: MatchState, arenaId, seats[], mode, paid, fee, tod}` · `DealState` in `engine/deal.ts`.

## 7. Visual direction
Deep-indigo UI with gold accent (lapis and gold of Persian tilework), flat vector landmark silhouettes with warm window glows, felt tables tinted per arena, cards in three styles. Fonts: Vazirmatn, bundled. Motion: card pop-in, glow pulse, slam banner. Sound: procedural WebAudio sfx + arena ambient. Mockups: the live build is the mockup — see `docs/screenshots/` (home, 2p table, 4p table, deal summary, results). `claude-design` and `ui-ux-pro-max` were **not installed** in this environment; I designed by hand and did not install anything.

## 8. Framework decision **[review — most consequential call]**
Compared for Android + iOS under Iran constraints:

| Option | For | Against |
|---|---|---|
| **Capacitor + React/TS (chosen)** | Engine in TS is reusable by a Node server; web build doubles as the **iOS PWA** channel that research found realistic; tiny bundle; fast iteration/testing here (no SDK needed) | Billing/ad plugins for Bazaar/Myket/Tapsell are community/bridge work; WebView perf on very old phones |
| Flutter | Mature `flutter_poolakey` + `iran_iap` (Bazaar+Myket) + `tapsell_plus`; good perf | Dart engine can't run on a Node server without rewrite; pub.dev/Gradle reachability from Iran unverified; Flutter/Xcode/Android SDK absent on this machine; no PWA-quality iOS story |
| Unity | Tapsell and Myket Unity SDKs exist | Heavy (APK size, low-end devices), overkill for a 2D card game, no web channel |
| Godot / Defold | Light | Smaller Iranian-SDK ecosystem, no web-engine reuse |
| React Native | Official `react-native-poolakey`; TS engine reusable | Heavier toolchain than Capacitor; no PWA reuse |

**Switch cost if you disagree:** engine and economy modules are UI-free TypeScript and would port as-is to React Native; Flutter would require porting both to Dart (about 1k lines plus tests). Framework-specific skill search (`find-skills`) was **not run** — your brief says to ask before installing, and I was told not to ask until v1.

## 9. Process notes
Graphify: see `docs/plan.md` for status. Ponytail: used — no extra state library, no router, no CSS framework, strings colocated via `tr(fa, en)`; simplifications noted with comments (`ponytail:` where a known ceiling exists).
