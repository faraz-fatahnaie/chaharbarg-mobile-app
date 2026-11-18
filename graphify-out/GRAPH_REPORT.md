# Graph Report - v1-offline-game  (2026-11-18)

## Corpus Check
- 100 files · ~173,157 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 10, (none) 6, .properties 2)

## Summary
- 604 nodes · 1122 edges · 59 communities (28 shown, 31 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b208acf3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- economy.ts
- deal.ts
- Chaharbarg runbook
- mobile/package.json
- چهاربرگ (Chaharbarg / Pasur)
- AppDelegate
- Game.tsx
- Communities (14 total, 0 thin omitted)
- lib/match.ts
- engine/package.json
- cdp.mjs
- compilerOptions
- compilerOptions
- ExampleInstrumentedTest.java
- package.json
- Backlog
- autopilot.ts
- gradlew
- android-apk.sh
- MainActivity.java
- ios-sim.sh
- AGENTS.md
- Package.swift
- CapApp-SPM/README.md
- graph/README.md
- docs/README.md
- Shop.tsx
- Chaharbarg — Design
- Chronicle 2026-11
- Chaharbarg (Pasur): product brief
- Verification Before Completion
- security-performance.md
- technical-manager.md
- Quality bar
- agents/builder.md
- scribe.md
- agents/architect.md
- agents/planner.md
- agents/reviewer.md
- roles/architect.md
- roles/builder.md
- roles/planner.md
- roles/reviewer.md

## God Nodes (most connected - your core abstractions)
1. `Game()` - 32 edges
2. `update()` - 21 edges
3. `useLang()` - 20 edges
4. `Home()` - 19 edges
5. `useProfile()` - 18 edges
6. `App()` - 17 edges
7. `sfx` - 17 edges
8. `Shop()` - 16 edges
9. `Chaharbarg runbook` - 16 edges
10. `applyDelta()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `CardViewProps` --references--> `Card`  [EXTRACTED]
  apps/mobile/src/art/CardView.tsx → packages/engine/src/cards.ts
- `buildCtx()` --calls--> `mulberry32()`  [EXTRACTED]
  apps/mobile/src/lib/match.ts → packages/engine/src/cards.ts
- `MatchCtx` --references--> `MatchState`  [EXTRACTED]
  apps/mobile/src/lib/store.ts → packages/engine/src/match.ts
- `Game()` --calls--> `chooseMove()`  [EXTRACTED]
  apps/mobile/src/screens/Game.tsx → packages/engine/src/bot.ts
- `Game()` --calls--> `captureOptions()`  [EXTRACTED]
  apps/mobile/src/screens/Game.tsx → packages/engine/src/deal.ts

## Import Cycles
- None detected.

## Communities (59 total, 31 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.13
Nodes (33): AdModal(), App(), start(), ICONS, PayModal(), Tab, arenaById(), ARENAS (+25 more)

### Community 1 - "economy.ts"
Cohesion: 0.07
Nodes (56): Achievement, AD_COOLDOWN_MS, AD_DAILY_CAP, AD_REWARD, adStatus(), applyDelta(), BIG_MARGIN_SHARE, bigMarginAt() (+48 more)

### Community 2 - "deal.ts"
Cohesion: 0.15
Nodes (32): cardWorth(), chooseMove(), moveGain(), threat(), isJack(), isKing(), isQueen(), newDeck() (+24 more)

### Community 3 - "Chaharbarg runbook"
Cohesion: 0.10
Nodes (21): 10. Wiring real ads and payments, 11. Common changes (recipes), 12. Data, storage and reset, 13. Troubleshooting, 14. Working in Iran: tooling notes, 1. Prerequisites, 2. First-time setup, 3. Run in a browser (fastest loop) (+13 more)

### Community 4 - "mobile/package.json"
Cohesion: 0.05
Nodes (43): dependencies, @capacitor/android, @capacitor/core, @capacitor/ios, @chaharbarg/engine, @fontsource/vazirmatn, react, react-dom (+35 more)

### Community 5 - "چهاربرگ (Chaharbarg / Pasur)"
Cohesion: 0.04
Nodes (43): Customisation and social-lite, Features and priorities, Gameplay, Persian-first, Progression and economy, Things the brief did not list (Iran/real-world gaps I found), Built (all on branch `worktree-v1-offline-game`), Known gaps (+35 more)

### Community 6 - "AppDelegate"
Cohesion: 0.09
Nodes (20): Any, AppDelegate, UIScene, UISceneSession, UIWindow, SceneDelegate, UIScene, UISceneSession (+12 more)

### Community 7 - "Game.tsx"
Cohesion: 0.15
Nodes (29): forfeit(), ACH_NAMES, EMOTES, checkAchievements(), todayKey(), ac(), setSoundEnabled(), sfx (+21 more)

### Community 8 - "Communities (14 total, 0 thin omitted)"
Cohesion: 0.07
Nodes (26): Ambiguous Edges - Review These, Communities (14 total, 0 thin omitted), Community 0 - "App shell and navigation", Community 10 - "Iran distribution and regulation", Community 11 - "Data model and tamper model", Community 12 - "UX features and known gaps", Community 13 - "Deal setup rules", Community 1 - "Economy and arena data" (+18 more)

### Community 9 - "lib/match.ts"
Cohesion: 0.14
Nodes (16): LANDMARKS, Pal, Scene(), STARS, Arena, TimeOfDay, timeOfDayFor(), botById() (+8 more)

### Community 10 - "engine/package.json"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, typescript, vitest, main, name, private (+6 more)

### Community 11 - "cdp.mjs"
Cohesion: 0.26
Nodes (11): chrome, clickText(), connect(), errors, ev(), go(), pending, send() (+3 more)

### Community 12 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 13 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, noEmit, skipLibCheck, strict, target, types (+1 more)

### Community 14 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): androidx.test.ext.junit.runners.AndroidJUnit4, ExampleInstrumentedTest, ExampleUnitTest, org.junit.runner.RunWith, org.junit.Test

### Community 15 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, test, version, workspaces

### Community 16 - "Backlog"
Cohesion: 0.25
Nodes (7): Awaiting approval, Backlog, Blocked, Done, In progress, Inbox, Ready

### Community 17 - "autopilot.ts"
Cohesion: 0.67
Nodes (5): clickText(), q(), qa(), run(), sleep()

### Community 18 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 19 - "android-apk.sh"
Cohesion: 0.50
Nodes (3): ANDROID_HOME, JAVA_HOME, android-apk.sh script

### Community 42 - "Shop.tsx"
Cohesion: 0.11
Nodes (26): backStyle(), CardView(), CardViewProps, GLYPH, PIPS, RANK(), BACK_STYLES, Cosmetic (+18 more)

### Community 43 - "Chaharbarg — Design"
Cohesion: 0.11
Nodes (16): 1. Principles and anti-goals, 2. Flow and screens (all built), 3. Arena system, 4. Economy, 5. Offline architecture, 6. Data model (see `economy.ts`), 7. Visual direction, 8. Framework decision **[review — most consequential call]** (+8 more)

### Community 44 - "Chronicle 2026-11"
Cohesion: 0.17
Nodes (11): 2026-11-15 · F-001 Change match targets to 35/65 (2-3 players) and 65/112 (4 players), chosen by players; pick the first player at random (docs/product/brief.md Decisions 5 and 6), 2026-11-15 · F-002 Update docs/rules-spec.md and README to the new match targets (35/65, 65/112) and random first player, 2026-11-15 · F-003 [Employer #1, offline P1] Settings screen: separate music and effects toggles, notifications toggle (local reminders only, no push service), contact support link, send feedback/suggestions, 2026-11-15 · F-004 [Employer #3, offline P2] Live in-game score panel top right: club count, points so far, sur count, total, for every player, 2026-11-15 · F-006 [Employer #7, offline P4] Local profile: change name and profile picture (separate from the avatar), 2026-11-15 · F-039 Remove the 50-point sur cap completely (rule R16, the 'surCap' house-rule toggle in Settings, the engine setting, tests, and mentions in docs/rules-spec.md, docs/plan.md, README). Sur always scores in, 2026-11-16 · F-005 [Employer #14, offline P3] Rebalance levels (1 to unlimited, slow growth): XP for finishing, winning, big margin, sur; penalty for quitting. Deliver a written report of the XP formula to the user for, 2026-11-16 · F-049 A forfeit still counts toward the daily 'play N games' challenge (found in F-005 review). Decide whether it should. (+3 more)

### Community 45 - "Chaharbarg (Pasur): product brief"
Cohesion: 0.18
Nodes (10): Chaharbarg (Pasur): product brief, Constraints, Decisions, Goals and success criteria, Key scenarios, Non-goals, Open questions, Problem (+2 more)

### Community 46 - "Verification Before Completion"
Cohesion: 0.20
Nodes (9): Common Failures, Key Patterns, Overview, Rationalization Prevention, Red Flags - STOP, The Gate Function, The Iron Law, Verification Before Completion (+1 more)

### Community 47 - "security-performance.md"
Cohesion: 0.50
Nodes (3): Review configuration and infrastructure, Review the change for performance, Review the change for security

### Community 48 - "technical-manager.md"
Cohesion: 0.50
Nodes (3): Hold a retrospective, Track milestones, Triage an item

### Community 49 - "Quality bar"
Cohesion: 0.50
Nodes (3): Always, Quality bar, This project's bars

## Knowledge Gaps
- **276 isolated node(s):** `chrome`, `ws`, `pending`, `errors`, `PackageDescription` (+271 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 330 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `economy.ts`, `mobile/package.json`, `Game.tsx`, `lib/match.ts`, `Shop.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Game()` (e.g. with `byRank()` and `label()`) actually correct?**
  _`Game()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `chrome`, `ws`, `pending` to the rest of the system?**
  _276 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12692307692307692 - nodes in this community are weakly interconnected._
- **Should `economy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07213114754098361 - nodes in this community are weakly interconnected._
- **Should `deal.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14512195121951219 - nodes in this community are weakly interconnected._
- **Should `Chaharbarg runbook` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._