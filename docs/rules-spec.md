# Chaharbarg (چهاربرگ) — Rules Spec v1

Primary source: `چهاربرگ.docx` (the "docx"). Where the docx is silent or ambiguous, the validated sources below decide.
Each rule is tagged **[docx]**, **[src]** (validated source) or **[call]** (my decision, flagged for review).

Sources: Pagat (https://pagat.com/fishing/pasur.html, updated 3 Jun 2026), Wikipedia "Pasur (card game)", Jahanshiri (https://www.jahanshiri.ir/cardgames/en/pasur).

Terms: **deal** (دست) = one full pass through the 52 cards; **round** (نوبت) = one batch of 4 cards per player. **Unit** = a player (2/3 players) or a team (4 players). **Floor** (زمین) = face-up cards.

## 1. Setup
- R1 [docx] 52-card deck. 2, 3 or 4 players. 4 players = two teams, partners opposite (seats 0&2 vs 1&3). Points are per team.
- R2 [docx] Shuffle. 4 cards face-up to the floor, then 4 to each player. Remaining cards stay in the stock; after everyone has played all 4 cards, 4 more are dealt to each player (floor is not re-dealt). Rounds per deal: 2p=6, 3p=4, 4p=3. Stock after first deal: 40 / 36 / 32 (matches docx tables).
- R3 [docx] First starter of the match is random. [call] Later deals: dealer rotates one seat in play direction; the player after the dealer plays first.
- R4 [src] Play direction is counter-clockwise (Pagat, Jahanshiri; Wikipedia says clockwise — conflict). In the RTL UI this is natural: turn passes to the player on the right.
- R5 [src] Opening floor: a single Jack is buried in the stock and replaced by the top stock card; if the floor then has >1 Jack, >2 Queens or >2 Kings, reshuffle and redeal (Pagat, Wikipedia, Jahanshiri agree). *Overrides the "no redeal" default in the brief.* Setting `openingJack: 'replace' | 'allow'`.

## 2. Card values
- R6 [docx] A=1, 2–10 = face value. Jack (سرباز), Queen (بی‌بی), King (شاه) have no numeric value.

## 3. Playing a card
Each turn a player must play exactly one card (no passing) [src].
- R7 [docx] **Numeric card (A–10)**: may capture a set of floor numeric cards (A–10) such that played value + set values = 11. The set must be non-empty.
- R8 [docx] **Queen** captures one Queen on the floor; **King** captures one King. They can capture nothing else, and nothing else captures them except a card of the same rank [src: Pagat/Wikipedia/Jahanshiri: one card, not all].
- R9 [docx] **Jack** captures *all* floor cards except Queens and Kings, regardless of sum, including other Jacks [src]. If the floor has no such card, the Jack captures nothing.
- R10 [src] One capture per play: the player picks **one** valid set (single group). No source allows several disjoint groups in one play.
- R11 [src] The played card goes to the capture pile together with the captured cards. If it captures nothing it stays on the floor.
- R12 [src] **Capture is compulsory for a card that can capture**: a player may choose *which* card to play, but may not drop a card that has a valid capture; they must pick one of its valid sets (Pagat: "if you played a card which does make a capture, you must take the captured cards"; Wikipedia agrees; the brief's "capture is not forced" is satisfied at the level of card choice). Setting `mustCapture` (default true).
- R13 [docx] If the played card has no capture it is dropped on the floor (so no-capture is the only way to add to the floor).
- R14 [docx] Docx example "4,4,4" (=12) is a typo for "4,4,3" — as the 3-player section writes it.

## 4. Sur (سور)
- R15 [docx] A **Sur** is scored when a capture leaves the floor empty. It is worth 5 points. Not a Sur if: (a) the capturing card is a Jack; (b) it happens in the **last round of the deal** (docx: "نوبت آخر", matches Pagat "last deal"). Docx marks (b) as "agree before play" → setting `noSurInLastRound` (default true, Pagat).
- R16 [src] **50-point cap**: a unit with ≥50 match points (as of the start of the current deal) cannot score a Sur (Pagat, Jahanshiri; docx "better to agree"). Setting `surCap` (default 50; `null` = off). Pagat's "second Sur cancels an opponent's Sur" is a variant not in the docx: **not implemented in v1**.
- R17 [docx][call] **Sur Sarbaz (سور سرباز)**: a lone Jack is the only card on the floor and the *next* player, an opponent, captures it (necessarily with a Jack, since a lone Jack can only be captured by a Jack) → the capturer's unit scores 10 points *instead of* the normal 5 (and this is the single exception to R15a). Neither Pagat nor Wikipedia nor Jahanshiri describes Sur Sarbaz, so this rule rests on the docx alone. The docx says "10" in the definition and "5" in the score list; **10 chosen** (rarer event; Wikipedia notes some play Sur = 10). "Start of next hand with his first card" is read as "on the next turn". Same last-round and 50-point restrictions as a normal Sur. Setting `surSarbazPoints` (default 10).

## 5. End of the deal
- R18 [src] When all cards have been played, the **last unit that made a capture takes all remaining floor cards** (no Sur for this). If nobody captured in the whole deal, the leftover floor cards go to nobody.

## 6. Scoring a deal (docx: base 20 points + Sur)
| Item | Points |
|------|--------|
| Most clubs (≥7) | 7 |
| Each Ace | 1 |
| Each Jack | 1 |
| 10♦ (ده‌لو) | 3 |
| 2♣ | 2 |
| Each Sur | 5 |
| Each Sur Sarbaz | 10 |
- R19 [docx][src] **Clubs**: 2 and 4 players: the unit with **≥7** clubs scores 7 (the docx says "more than seven", but with 13 clubs a 7–6 split would leave the 7 unawarded, contradicting its own "20 points per deal"; Pagat/Jahanshiri say "7 or more"). 3 players: the unit with strictly most clubs scores 7; if two units tie for most, the **third** scores 7 even with fewer clubs (docx, Pagat, Jahanshiri; Wikipedia's scoring section says nobody scores — conflict, docx wins).
- R20 [docx] Base points per deal always total 20 (invariant under test).

## 7. Match
- R21 [src] A match is played over successive deals until a unit reaches the **target score**; default 62 (Pagat, Wikipedia, Jahanshiri agree; 100 is a common variant). Ties at the top continue to another deal. Option `target: 'single'` plays one deal only. Settings: `target` ∈ {62, 100, 'single'}.
- R22 [call] The mid-deal "per shodam" early finish (Pagat) is not implemented in v1.

## 8. Test list (engine)
Capture generation: T1 sum-11 pairs and triples; T2 A counts 1 (10+A); T3 Q/K only pair; T4 numeric cannot take Q/K; T5 Jack takes all but Q/K incl. Jacks; T6 Jack with only Q/K takes nothing; T7 played card included in sum; T8 no empty set; T9 several valid sets listed.
Turn: T10 played card moves to pile on capture; T11 no capture → floor; T12 mustCapture forbids dropping a capturing card; T13 can drop a non-capturing card while holding capturing cards; T14 turn order ccw and teams alternate in 4p.
Deal flow: T15 deal counts 2/3/4p (stock 40/36/32, rounds 6/4/3); T16 redeal at round end only when all hands empty; T17 opening-jack replace/redeal; T18 all 52 cards conserved at every step.
Sur: T19 clearing floor = sur; T20 jack clear = no sur; T21 last-round clear = no sur (and toggle); T22 sur cap ≥50; T23 Sur Sarbaz = 10; T24 lone jack captured by jack on a later (non-adjacent) turn = plain, no Sarbaz.
End/score: T25 last capturer takes leftovers; T26 base points total 20 for 2/3/4p over random games; T27 clubs ≥7 (7–6 split); T28 3p clubs tie → third gets 7; T29 4p team aggregation; T30 target 62 ends match, tie continues.
Bots: T31 bots only return legal moves; T32 full random self-play for 2/3/4p terminates and conserves cards.
