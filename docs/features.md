# Features and priorities

Legend: **✅ built in this branch** · v1 = release scope · v2 = next · later = after v1 (online etc.)

## Gameplay
| Feature | Priority | Status |
|---|---|---|
| Rules engine: 2/3/4 players, teams, sur, Sur Sarbaz, scoring, match to 62/100/single deal | v1 | ✅ 36 tests |
| Bots at 3 levels (measured: medium beats easy 75%, hard beats medium 65%) | v1 | ✅ |
| Pass-and-play on one device with hand-off screen | v1 | ✅ |
| Valid-capture hints, one-tap combination chips when several captures exist | v1 | ✅ |
| Deal summary table (how every point was earned), big «سور!» banner | v1 | ✅ |
| Resume an unfinished match after closing the app | v1 | ✅ |
| Interactive tutorial (guided, on a live table) | v1 | ◐ slide tutorial built; guided live version v2 |
| House rules screen (target, 50-point cap, last-round sur, forced capture, opening jack, Sarbaz value) | v1 | ✅ |
| Bot personalities (names, quick-chat lines, trait) | v1 | ◐ names + lines built; play-style differences v2 |
| Undo/“are you sure” for drops of valuable cards | v2 | |
| Replays and shareable highlights (needs a move log: store seed + moves) | v2 | |
| "Per shodam" early finish (Pagat variant) and sur-cancel variant | later | rules-spec §R16/R22 |

## Progression and economy
| Feature | Priority | Status |
|---|---|---|
| 10 arenas with fee, trophy gate, bot level, time-of-day variants | v1 | ✅ |
| Shahi (soft) + Gohar (premium), hash-chained ledger, tamper rollback | v1 | ✅ |
| Trophies, XP, levels (Gohar on level-up), achievements | v1 | ✅ |
| Daily login streak, 3 daily challenges, relief gift when broke | v1 | ✅ |
| Rewarded ad (home / result only) with cooldown + daily cap | v1 | ✅ mock provider |
| Gohar packs + restore purchases (idempotent tokens) | v1 | ✅ mock provider |
| Real Tapsell/Adivery adapter; real Bazaar + Myket billing | v1 | ❌ needs SDK accounts, see research.md |
| Seasons, tournaments, global leaderboards | later | needs server |

## Customisation and social-lite
| Feature | Priority | Status |
|---|---|---|
| 3 decks (classic, large-index for accessibility, Ganjifeh-inspired), 4 card backs, 4 tables | v1 | ✅ |
| Layered 2D avatar creator (clothes, accessories, frames) | v2 | initials avatars for now |
| Genuinely Ganjifeh-style illustrated deck (commissioned/original art) | v2 | |
| Quick-chat stickers (bots answer) | v1 | ✅ text stickers; illustrated v2 |
| Local stats, per-arena record | v1 | ✅ |
| Share a result card as an image (Eitaa/Bale/Rubika/Telegram share sheet) | v2 | |
| Online play, free-text chat, friends | later | engine is server-ready |

## Persian-first
| Feature | Priority | Status |
|---|---|---|
| RTL layout, Vazirmatn bundled (no Google Fonts), Persian digits, Jalali date | v1 | ✅ |
| English as second language | v1 | ✅ (all screens) |
| Procedural sound + per-arena ambient bed (no audio files) | v1 | ✅ |
| Recorded Persian-instrument music and sfx (santur, daf) | v2 | |
| Seasonal arena skins: Nowruz, Yalda night, Mehregan (secular, cultural) | v2 | |

## Things the brief did not list (Iran/real-world gaps I found)
1. **Low-end Android.** Many devices are 2 GB RAM, Android 7–10. The web build is ~94 KB gzip JS plus bundled Vazirmatn (about 27 KB per weight); no video/3D. Keep it that way. (Profile on a real low-end device — not done here.)
2. **No FCM.** Push notifications cannot use Firebase. Plan: local scheduled notifications (daily reward reminder) first; an Iranian push provider later (unverified which are reliable).
3. **iOS = PWA/sideload.** Installable PWA ships now (manifest + offline service worker). Add an "Add to Home Screen" coach-mark in v2.
4. **Regulatory sensitivity of card games** and **ESRA age rating**: see research.md §5. The UI avoids gambling cues (no «شرط», no pot imagery; prize/entry wording).
5. **Data safety:** all data is local; "Erase all data" exists. No analytics, no accounts, no network calls at all in v1.
6. **Economy honesty:** the "pot" is a 10% sink (win pays 1.8× entry, 2p). Expected net per match for a 50% player is −10% of the fee; income comes from daily login, challenges and ads. Needs playtest tuning.
7. **Accessibility:** large-index deck, hints, Persian digits; colour-blind-safe four-colour deck is v2.
8. **Cheating surface:** offline coins can be edited; ledger rollback stops casual edits only. Because Shahi/Gohar have no cash value and can't be cashed out, the risk is cosmetic; real protection arrives with server verification in the online phase.
