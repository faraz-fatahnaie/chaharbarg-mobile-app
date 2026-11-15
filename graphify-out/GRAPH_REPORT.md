# Graph Report - v1-offline-game  (2026-11-15)

## Corpus Check
- 82 files · ~164,884 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .xml 10, (none) 6, .properties 2)

## Summary
- 522 nodes · 1077 edges · 42 communities (20 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7acd7aba`
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

## God Nodes (most connected - your core abstractions)
1. `Game()` - 34 edges
2. `update()` - 22 edges
3. `useLang()` - 21 edges
4. `Home()` - 20 edges
5. `useProfile()` - 19 edges
6. `App()` - 18 edges
7. `applyDelta()` - 17 edges
8. `sfx` - 17 edges
9. `Shop()` - 17 edges
10. `Chaharbarg runbook` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Rule calls you may want to overrule (details in rules-spec.md)` --references--> `RulesConfig`  [INFERRED]
  docs/plan.md → packages/engine/src/deal.ts
- `6. Data model (see `economy.ts`)` --references--> `DealState`  [INFERRED]
  docs/design.md → packages/engine/src/deal.ts
- `God Nodes (most connected - your core abstractions)` --references--> `App()`  [INFERRED]
  docs/graph/GRAPH_REPORT.md → apps/mobile/src/App.tsx
- `Architecture in brief` --references--> `applyDelta()`  [INFERRED]
  README.md → apps/mobile/src/economy/economy.ts
- `Architecture in brief` --references--> `verifyProfile()`  [INFERRED]
  README.md → apps/mobile/src/economy/economy.ts

## Import Cycles
- None detected.

## Communities (42 total, 22 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.09
Nodes (50): AdModal(), App(), start(), ICONS, backStyle(), CardView(), GLYPH, PIPS (+42 more)

### Community 1 - "economy.ts"
Cohesion: 0.09
Nodes (48): ARENAS, Achievement, AD_COOLDOWN_MS, AD_DAILY_CAP, AD_REWARD, adStatus(), applyDelta(), canClaimRelief() (+40 more)

### Community 2 - "deal.ts"
Cohesion: 0.13
Nodes (40): 5. Offline architecture, cardWorth(), chooseMove(), moveGain(), threat(), Card, isJack(), isKing() (+32 more)

### Community 3 - "Chaharbarg runbook"
Cohesion: 0.04
Nodes (43): PayModal(), adProvider, AdUI, bought, PayUI, registerPayUI(), storeProvider, 1. Principles and anti-goals (+35 more)

### Community 4 - "mobile/package.json"
Cohesion: 0.05
Nodes (43): dependencies, @capacitor/android, @capacitor/core, @capacitor/ios, @chaharbarg/engine, @fontsource/vazirmatn, react, react-dom (+35 more)

### Community 5 - "چهاربرگ (Chaharbarg / Pasur)"
Cohesion: 0.05
Nodes (36): Customisation and social-lite, Features and priorities, Gameplay, Persian-first, Progression and economy, Things the brief did not list (Iran/real-world gaps I found), 1. Distribution, 2. Payments (+28 more)

### Community 6 - "AppDelegate"
Cohesion: 0.09
Nodes (20): Any, AppDelegate, UIScene, UISceneSession, UIWindow, SceneDelegate, UIScene, UISceneSession (+12 more)

### Community 7 - "Game.tsx"
Cohesion: 0.16
Nodes (24): forfeit(), ACH_NAMES, EMOTES, checkAchievements(), settleMatch(), ac(), setSoundEnabled(), sfx (+16 more)

### Community 8 - "Communities (14 total, 0 thin omitted)"
Cohesion: 0.07
Nodes (26): Tab, CardViewProps, Ambiguous Edges - Review These, Communities (14 total, 0 thin omitted), Community 0 - "App shell and navigation", Community 10 - "Iran distribution and regulation", Community 11 - "Data model and tamper model", Community 12 - "UX features and known gaps" (+18 more)

### Community 9 - "lib/match.ts"
Cohesion: 0.15
Nodes (14): LANDMARKS, Pal, Scene(), STARS, Arena, TimeOfDay, timeOfDayFor(), botById() (+6 more)

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

## Knowledge Gaps
- **205 isolated node(s):** `chrome`, `ws`, `pending`, `errors`, `PackageDescription` (+200 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `lib/match.ts`, `mobile/package.json`, `economy.ts`, `Game.tsx`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `Architecture in brief` connect `deal.ts` to `economy.ts`, `Chaharbarg runbook`, `چهاربرگ (Chaharbarg / Pasur)`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `چهاربرگ (Chaharbarg / Pasur)` connect `چهاربرگ (Chaharbarg / Pasur)` to `deal.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Game()` (e.g. with `byRank()` and `label()`) actually correct?**
  _`Game()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `chrome`, `ws`, `pending` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09491525423728814 - nodes in this community are weakly interconnected._
- **Should `economy.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08635703918722787 - nodes in this community are weakly interconnected._