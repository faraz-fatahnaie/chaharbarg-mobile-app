# Graph Report - gcorpus  (2026-10-28)

## Corpus Check
- Corpus is ~21,256 words - fits in a single context window. You may not need a graph.

## Summary
- 318 nodes · 832 edges · 14 communities
- Extraction: 93% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App shell and navigation
- Economy and arena data
- Bots and move choice
- Rules spec and decisions
- Profile, ledger, achievements
- Arena scene art
- Design principles and economy
- Card rendering
- Framework decision
- Offline architecture
- Iran distribution and regulation
- Data model and tamper model
- UX features and known gaps
- Deal setup rules

## God Nodes (most connected - your core abstractions)
1. `Game()` - 24 edges
2. `update()` - 21 edges
3. `useLang()` - 20 edges
4. `useProfile()` - 18 edges
5. `App()` - 17 edges
6. `sfx` - 17 edges
7. `Home()` - 17 edges
8. `applyDelta()` - 15 edges
9. `todayKey()` - 12 edges
10. `Shop()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Chaharbarg (Pasur) offline Persian card game` --conceptually_related_to--> `Arena system (10 arenas)`  [EXTRACTED]
  README.md → docs/design.md
- `Valid-capture hints and combination chips` --conceptually_related_to--> `R12 Capture compulsory for a capturing card (mustCapture)`  [INFERRED]
  docs/features.md → docs/rules-spec.md
- `Low-end Android constraint (2 GB, Android 7-10)` --rationale_for--> `Framework decision (most consequential call)`  [INFERRED]
  docs/features.md → docs/design.md
- `Next steps (playtest, store policy, APK, iOS, assets, replays)` --references--> `Replays and shareable highlights (v2, needs move log)`  [INFERRED]
  docs/plan.md → docs/features.md
- `Deal summary table and Sur banner` --shares_data_with--> `Deal scoring table (clubs 7, Ace 1, Jack 1, 10 of diamonds 3, 2 of clubs 2, Sur 5, Sur Sarbaz 10)`  [INFERRED]
  docs/features.md → docs/rules-spec.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Capture rules by card type (numeric, Queen/King, Jack)** — docs_rules_spec_r7_numeric_capture, docs_rules_spec_r8_queen_king_capture, docs_rules_spec_r9_jack_capture, docs_rules_spec_r10_single_capture_group [EXTRACTED 1.00]
- **Two-currency economy (Shahi soft, Gohar premium, ledger, rake)** — docs_design_shahi, docs_design_gohar, docs_design_pot_rake, docs_design_tamper_ledger [INFERRED 0.85]
- **Distribution channels (Bazaar, Myket, iOS PWA, third-party iOS stores)** — docs_research_cafe_bazaar, docs_research_myket, docs_research_ios_pwa, docs_research_third_party_ios [INFERRED 0.85]

## Communities (14 total, 0 thin omitted)

### Community 0 - "App shell and navigation"
Cohesion: 0.09
Nodes (42): AdModal(), App(), forfeit(), start(), ICONS, PayModal(), Tab, arenaById() (+34 more)

### Community 1 - "Economy and arena data"
Cohesion: 0.09
Nodes (43): ARENAS, Achievement, ACHIEVEMENTS, AD_COOLDOWN_MS, AD_DAILY_CAP, AD_REWARD, adStatus(), applyDelta() (+35 more)

### Community 2 - "Bots and move choice"
Cohesion: 0.12
Nodes (35): cardWorth(), chooseMove(), Level, moveGain(), threat(), Card, isJack(), isKing() (+27 more)

### Community 3 - "Rules spec and decisions"
Cohesion: 0.16
Nodes (29): Deal summary table and Sur banner, House rules screen, Later variants (per shodam, sur-cancel), Rule calls to overrule (8 decisions), Rules sources gaps (Sur Sarbaz, multi-group capture), چهاربرگ.docx (primary rules source), Engine test list T1-T32, Jahanshiri (jahanshiri.ir Pasur) (+21 more)

### Community 4 - "Profile, ledger, achievements"
Cohesion: 0.18
Nodes (20): ACH_NAMES, createProfile(), DEFAULT_SETTINGS, levelOf(), verifyProfile(), Lang, toFa(), useLang() (+12 more)

### Community 5 - "Arena scene art"
Cohesion: 0.12
Nodes (16): LANDMARKS, Pal, Scene(), STARS, Arena, TimeOfDay, timeOfDayFor(), botById() (+8 more)

### Community 6 - "Design principles and economy"
Cohesion: 0.12
Nodes (22): AdProvider / ads policy (Home and Result only, mock), Arena system (10 arenas), Flow and screens (Home, Game, tabs), Gohar (گوهر) premium currency, Pot and 10% rake sink, Principles and anti-goals, Shahi (شاهی) soft currency, Trophy/XP progression (+25/-12, level-up 2 Gohar) (+14 more)

### Community 7 - "Card rendering"
Cohesion: 0.17
Nodes (18): backStyle(), CardView(), CardViewProps, GLYPH, PIPS, RANK(), BACK_STYLES, Cosmetic (+10 more)

### Community 8 - "Framework decision"
Cohesion: 0.16
Nodes (17): Flutter (option), Framework decision (most consequential call), Godot / Defold (option), React Native (option), StoreProvider and idempotent grantPurchase, Unity (option), No FCM push (local notifications first), Real Tapsell/Adivery and Bazaar/Myket adapters (not built) (+9 more)

### Community 9 - "Offline architecture"
Cohesion: 0.32
Nodes (8): Capacitor + React/TS (chosen), packages/engine (pure TS rules engine + bots), apps/mobile (React 19 + Vite + Capacitor 8), Offline architecture (engine + mobile + Capacitor), Ponytail process (minimal dependencies), Online play, seasons, leaderboards (later, needs server), Rules engine feature (2/3/4p, 35 tests), Built slices 1-5 (rules spec, engine, economy, app, native shell)

### Community 10 - "Iran distribution and regulation"
Cohesion: 0.29
Nodes (10): iOS via PWA / sideload, Regulatory sensitivity and ESRA age rating, Next steps (playtest, store policy, APK, iOS, assets, replays), Apple removed Iranian apps (2017 sanctions), Capacitor Poolakey plugins (capacitor-poolakey, cordova-plugin-android-iab), Card-game sensitivity (Wikishia, store policy unknown), ESRA/ERSA age rating, Installable PWA as iOS channel (+2 more)

### Community 11 - "Data model and tamper model"
Cohesion: 0.29
Nodes (7): Data model (Profile, MatchCtx, DealState), Persistence (localStorage profile.v1 / match.v1), Hash-chained ledger tamper model, Cheating surface (editable offline coins), Data safety (local only, erase all data, no analytics), Replays and shareable highlights (v2, needs move log), Resume unfinished match

### Community 12 - "UX features and known gaps"
Cohesion: 0.40
Nodes (5): Valid-capture hints and combination chips, Low-end Android constraint (2 GB, Android 7-10), Tutorial (slides built, guided live v2), docs/graph (graphify output), Known gaps

### Community 13 - "Deal setup rules"
Cohesion: 0.67
Nodes (3): R1 Players and teams (2/3/4, partners opposite), R2 Deal structure (4 floor, 4 each; rounds 6/4/3), R3 Starter random, dealer rotates

## Ambiguous Edges - Review These
- `Wikipedia: Pasur (card game)` → `R19 Clubs scoring (>=7, 3p tie gives third)`  [AMBIGUOUS]
  docs/rules-spec.md · relation: references
- `Wikipedia: Pasur (card game)` → `R4 Play direction counter-clockwise`  [AMBIGUOUS]
  docs/rules-spec.md · relation: references
- `R17 Sur Sarbaz (lone Jack capture, 10 points)` → `Deal scoring table (clubs 7, Ace 1, Jack 1, 10 of diamonds 3, 2 of clubs 2, Sur 5, Sur Sarbaz 10)`  [AMBIGUOUS]
  docs/rules-spec.md · relation: shares_data_with
- `Rules engine feature (2/3/4p, 35 tests)` → `Built slices 1-5 (rules spec, engine, economy, app, native shell)`  [AMBIGUOUS]
  docs/features.md · relation: shares_data_with

## Knowledge Gaps
- **58 isolated node(s):** `Tab`, `ICONS`, `GLYPH`, `PIPS`, `CardViewProps` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 70 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Wikipedia: Pasur (card game)` and `R19 Clubs scoring (>=7, 3p tie gives third)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Wikipedia: Pasur (card game)` and `R4 Play direction counter-clockwise`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `R17 Sur Sarbaz (lone Jack capture, 10 points)` and `Deal scoring table (clubs 7, Ace 1, Jack 1, 10 of diamonds 3, 2 of clubs 2, Sur 5, Sur Sarbaz 10)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Rules engine feature (2/3/4p, 35 tests)` and `Built slices 1-5 (rules spec, engine, economy, app, native shell)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `Rule calls to overrule (8 decisions)` connect `Rules spec and decisions` to `Offline architecture`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Next steps (playtest, store policy, APK, iOS, assets, replays)` connect `Iran distribution and regulation` to `Framework decision`, `Offline architecture`, `Data model and tamper model`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Game()` (e.g. with `byRank()` and `label()`) actually correct?**
  _`Game()` has 2 INFERRED edges - model-reasoned connections that need verification._