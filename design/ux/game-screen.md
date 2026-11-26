# Game Screen UX Spec (Chaharbarg / Pasur)

Scope: `apps/mobile/src/screens/Game.tsx` + game section of `styles.css`. Replaces `.hud`, `.live`, `.arena`, `.myzone` flow layout.
Benchmark: Clash Royale. One glance shows whose turn it is, what you can do, and who is winning. Every state change has a motion.

Root causes of today's bugs (from code):
- `.arena{flex:1}` sits above `.myzone`, whose height changes with `.hint-line`, `.opts` (max 68px), `.actions` and the `.myhand` lift. The flex remainder changes, so the table moves.
- `.floor` is `flex-wrap` + `justify-content:center` + `--cw` tiers (`many`/`lots`). Each card added or removed re-centres every card, and the size tier snaps at 10 and 15 cards.
- `.hud` + `.live` are two stacked blocks. `.live` is a 5-column table that the player has to read as a spreadsheet.

Principle: **every zone has a fixed height. Content never changes a zone's size. Only content inside a zone can change.**

---
## 1. Layout: fixed-zone grid

`.game` becomes `position:absolute; inset:0; display:grid` (inside `.app`, which already has a definite height). Safe-area insets go on `.game` as padding (`env(safe-area-inset-top/bottom)`), so rows are `fr`/% of what remains. `.game` also gets `overflow:hidden`.

```css
.game{
  position:absolute; inset:0; overflow:hidden;
  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
  display:grid;
  grid-template-rows: 15fr 13fr 31fr 14fr 22fr 5fr;   /* sum = 100 */
  grid-template-areas:"score" "opps" "floor" "action" "hand" "foot";
  --pad: 8px;
}
.game > * { min-height:0; min-width:0; }   /* a child can never grow its row */
```
Rows use `fr` with `min-height:0`, so content can never stretch a row. Each zone below is `overflow:hidden` or `overflow:visible` only for decorative overlays (see notes).

| Zone | % | 360x640 (~600 usable after safe areas) | 430x932 (~890 usable) | Contents |
|---|---|---|---|---|
| score | 15 | 90 | 133 | top bar row (fixed 36px) + scoreboard cards (rest) |
| opps | 13 | 78 | 116 | opponent seats (2/3/4p) |
| floor | 31 | 186 | 276 | felt + 7x3 slot grid |
| action | 14 | 84 | 125 | hint (18px) / options strip (34px) / buttons (rest) |
| hand | 22 | 132 | 196 | my fan |
| foot | 5 | 30 | 45 | my avatar + pile chip + stock chip + chat button |

If the device is shorter than 600px usable (`max-height:600px`), set rows to `14fr 12fr 31fr 15fr 23fr 5fr` and hand card width to 56px. Never scroll the page.

Scene art (`.scene`) stays an absolutely positioned backdrop behind everything (`z-index:0`), no layout role. The felt ellipse is `position:absolute` inside the floor zone only, so it is the same on every turn.

### 1.1 Floor: fixed slot grid
- 7 columns x 3 rows = **21 slots** (max floor is 20, so one spare slot is always free for a drop).
- `.floor{grid-area:floor; position:relative; container-type:size; margin:0 var(--pad)}`.
- Card size is a pure function of the floor container, so it never depends on card count:
  ```css
  .floor{ --cw: min(calc(100cqw / 7 - 4px), calc((100cqh - 6px) / 4.3));  /* card width */
          --ch: calc(var(--cw) * 1.42);
          --px: calc(100cqw / 7);                 /* column pitch */
          --py: calc((100cqh - var(--ch)) / 2);   /* row pitch; 3 rows => 2 pitches + 1 card = 100cqh */
  }
  .floor .slot-card{ position:absolute; left:0; top:0; width:var(--cw);
    transform: translate(calc(var(--c) * var(--px) + (var(--px) - var(--cw)) / 2),
                         calc(var(--r) * var(--py)));
    transition: transform .22s cubic-bezier(.2,.8,.2,1); }
  ```
  Result: 360x640 -> cw ~44px (h 63); 430x932 -> cw ~53px (h 75). The old `many`/`lots` tiers (36/42px) are deleted. Cards are never smaller than 44px wide, which meets the touch-target minimum. If hit area is tight, add `::after{inset:-3px}` on `.slot-card`.
- **Slot assignment (React):** `slotOf: Record<cardId, 0..20>` in a `useRef`, kept across renders. Reconcile after every deal-state change:
  1. Remove ids no longer on the floor (their slots become free; **nobody else moves**).
  2. Each new id takes the lowest free index in `FILL_ORDER`.
- `FILL_ORDER` (row, col), middle row first, centre-out, so a sparse floor looks centred and balanced:
  - Row 1 (middle): cols 3,2,4,1,5,0,6 (slots 0-6)
  - Row 0 (top): cols 3,2,4,1,5,0,6 (slots 7-13)
  - Row 2 (bottom): cols 3,2,4,1,5,0,6 (slots 14-20)
  Slot index -> `--c`, `--r` via a constant array. `--c`/`--r` are set inline per card.
- **Where a newly played card goes:** its assigned slot (above). It animates from the hand origin (see 4.3) to that slot's transform; no other card moves. When the opening 4 floor cards are dealt they take slots 0-3 (cols 3,2,4,1).
- Cards removed by a capture leave a gap on purpose. Do not compact. (The empty slot is reused by the next dropped card.)
- When the floor is empty show `.center-tag` at the centre of the middle row, absolutely positioned (no layout effect).
- Tap targets on the floor are the cards only; empty slots are inert. Hint glow/dim states use opacity and `box-shadow` only (no size change, so no reflow). `pick`/`sel` lift uses `translateY(-6px)` as an added `transform` on an inner wrapper so the slot transform stays untouched.

### 1.2 Opponent seats (zone `opps`)
`.opps{grid-area:opps; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:center; padding:0 var(--pad)}`.
Seats use physical columns (see 5.2: seating is not mirrored in RTL).
- 2p: one seat in column 2.
- 3p: seats in columns 1 and 3 (column 2 is empty and used for the opponent turn-banner if needed).
- 4p: seat to the left (col 1), partner (col 2, tinted with team colour and a "partner" tag), seat to the right (col 3). Seating order follows play order: clockwise from the player, and in RTL the order mirrors (play direction is the same visually, since layout mirrors).
Seat = column with fixed height 100%: avatar 38px (turn ring around it, see 3.4), name (11px, ellipsis, max 84px), a fan of card backs (cw 16px, max 6 cards, hidden for >6, shown as "x6" badge) and a pile chip (card icon + count) that is the **capture target** (`data-pile=seat`). Speech bubbles are absolutely positioned and open **below** the avatar (never above, so they are not clipped by the score zone) and can overlay the floor without affecting layout.

### 1.3 Action row (zone `action`)
Fixed inner grid `grid-template-rows: 18px 34px 1fr` (hint, options, buttons). Always rendered, even when empty.
- **Hint**: 12px, one line, ellipsis. Always occupies 18px. Text swaps with a crossfade (`opacity .15s`); no height change. When the timer is active the timer is NOT in the hint; it lives in the avatar ring (3.4).
- **Options strip**: height 34px, `display:flex; overflow-x:auto; scroll-snap-type:x proximity; gap:6px; scrollbar-width:none`. Always present; `visibility:hidden` when there are fewer than 2 options. Chips are `min-width:64px; height:30px`; the chip order is stable (sorted by size desc, then by rank). Edge fade mask (`mask-image` linear-gradient 12px) shows overflow. Selected chip auto-scrolls into view.
- **Buttons**: 2-slot grid `grid-template-columns:1fr 1fr; gap:8px`, each button full-row height (min 44px). `Capture` in the end slot, `Drop` in the start slot. A missing action leaves an empty cell (hidden), so positions never change. "X's turn..." text is shown in this area as a muted label when it is not my turn (same cell, centred over both).

### 1.4 Hand fan (zone `hand`)
- Cards `--cw:min(66px, 17cqw)`, hand width max 4 cards (+2 spare for variants). Container `position:relative`, `container-type:size`.
- Fan: each card `position:absolute`, bottom centre, `transform: translateX(var(--x)) translateY(var(--y)) rotate(var(--a))` where for index i of n (centred around (n-1)/2, d = i - (n-1)/2): `--x = d*(cw*0.78)`, `--a = d*5deg`, `--y = abs(d)*abs(d)*2px`. Cards are at fixed positions by **sort order of the full 4-card hand**; when a card is played, the remaining cards slide closed (`transition .25s`) but the fan's bottom edge and height are fixed, so nothing above changes.
- Selected card: `translateY(-18px) scale(1.06)`, z-index 5. The lift stays inside `hand`: the zone reserves 20px of headroom via `padding-top:20px`.
- Hand is non-interactive and dimmed (`opacity:.55`) when not my turn.

### 1.5 Footer (zone `foot`)
One row: [my avatar 28px + name] [my pile chip, capture target `data-pile=me`] [stock chip: back-of-card icon + count] [spacer] [quick-chat button 36x36]. Chat panel (emotes) is a **popover above the foot** (`position:absolute; bottom:100%`), overlaying the hand, not inserted in the flow (today `.emotes` is a grid row and pushes the layout). Chat/sticker button visible in bots mode and online (online sends stickers only, same rate limit `CHAT_GAP_MS`).

Mirroring: the foot, score and opps rows use logical properties (`margin-inline`, `padding-inline`, `inset-inline`) and grid column order, so the whole screen mirrors in RTL with no extra CSS.

---
## 2. Scoreboard

Replaces `.hud .score` + `.live`. One component, `<Scoreboard/>`, in zone `score`.

### 2.1 Layout
Row A (36px): `☰ menu` (start) | centre: `Deal 2 · Round 3/6` + stock chip is NOT here | `target flag` "Goal 65" | `🔊/settings` (end). Menu is 36x36, Goal chip is plain text.
Row B (the scoreboard, rest of zone, ~48-90px): one **unit card** per unit, equal widths, 6px gap, with a thin centre "VS" notch for 2 units.

Unit card (me = gold border + subtle glow; opponents = neutral):
```
[avatar 24]  Name (ellipsis)                      +12   <- live deal total pill (gold)
[=========|-----------------]  47 / 65             <- match progress bar + numbers
 ♣5  A2  J1  ·  ★1                                <- live breakdown, 11px
```
- **Avatar**: 24px circle; in 4p, team card shows two overlapping avatars (me + partner, or the two opponents).
- **Name**: `unitName(u)` (existing). 4p: "Your team"/"Opponents" (pnp: "Team 1/2"). 3p/2p: seat name; me = "You". The team label is a small chip on the card's top-end corner in 4p only.
- **Match progress bar**: height 6px, `width = score/target`, fill colour = unit hue (me gold), numerals: big `47` (16px bold, tabular-nums) + muted `/65`. Bar track has a tick at 100% (right end). Fill animates `transition: width .6s` (see 4.9).
- **Live pill** (`+N`): `liveScore(deal)[u].total` (points from aces, jacks, 10 of diamonds, 2 of clubs, sur, sur sarbaz; clubs bonus included for 2p/4p, excluded in 3p until the deal is over). Prefix `+`. It shows what this unit **would add** if the deal ended now. Pop animation on change (4.7).
- **Breakdown row** (11px, icons + numbers, only non-zero shown, max 4 items, fixed 14px row height; not shown if the card is < 96px wide, see below): clubs `♣ clubCount` (turns gold when >= 7: the threshold that earns the bonus, tooltip "7+"), `points` (`liveScore.points`: card points), `surs` (`liveScore.surs`, star icon). Zero values render nothing but keep the row height.
- Narrow variant: `min-width:96px`. With 3 units on 360px: (360-16-12)/3 = 110px per card. 4p has 2 cards (team) so wide. If a card is under 96px, hide the breakdown row (the detail sheet carries it).
- **Leader marker**: a crown icon on the unit with the highest match score (ties: none); also text label via `aria-label`, never colour alone.
- **Placement**: in 3p, small rank badge (1/2/3) at the card's start-top corner, updated live (by match score, then live total). 2p/4p have no placement badge (leader crown is enough).
- Card order is fixed: me first (start side), then play order. It never re-sorts (sorting moves things; the rank badge shows placement instead).

### 2.2 Expandable detail
Tap anywhere on the scoreboard (or `Enter`/`Space` when focused) opens a **dropdown panel** `position:absolute; top:100% of score zone; inset-inline:var(--pad)` overlaying the opps zone (`z-index:20`, no layout shift), `max-height:46%` of the game. A scrim (`rgba(0,0,0,.35)`) sits behind it; tapping the scrim, `Esc` or tapping the scoreboard again closes it.
Content: compact table, rows = Clubs (n / 7+ bonus), Aces, Jacks, 10♦, 2♣, Sur, Sur Sarbaz, "This deal (live)", "Match total"; columns = units. Data source: `scoreDeal(deal)` (per-component) with the same 3p clubs rule as `liveScore`. Reuse the row definitions from the end-of-deal summary table (same labels) so the two never drift. It also shows the previous deals as a small history strip (`mc.history`) in a second tab "History". Opens with `scaleY .18s` from the top edge. The panel never captures the game clock (the turn timer keeps running; it is intentionally visible).
- Auto-closes when it becomes my turn? No. It stays open until dismissed, but my turn start plays the turn indicator (3.4) on the avatar and a haptic tick, so it is not missed.

### 2.3 Variants
- **2p**: two cards, VS notch in the centre (the notch is a 20px circle with "VS" text, overlapping the two cards; its position is fixed).
- **3p**: three cards, each with a rank badge; breakdown hidden below 96px.
- **4p teams**: two team cards; each has the team label chip ("Your team"/"Opponents", or "Team 1/2" in pnp), 2 avatars, and the live row shows the team's combined values (as `liveScore` already aggregates per unit). Partner seat in `opps` has the same tint as my team card (team hue; also a "partner" text tag), so team colour is not the only cue.

---
## 3. Interaction states

Hit areas >= 44x44 CSS px. All states have a non-colour cue (shape/position/text).

### 3.1 Selection (hand)
| State | Visual | Audio/haptic |
|---|---|---|
| Idle (my turn) | Hand at rest; playable cards have a very soft 2s idle breathing glow (`opacity` of the ring .0-.4) | none |
| Selected | card lifts -18px + scale 1.06 (120ms, `cubic-bezier(.2,1.4,.4,1)`), gold ring; capturable floor cards pulse (hint on) and non-capturable floor cards dim to .5; hint text updates | `click` + 8ms haptic |
| Tap selected again | commit (see 3.2) | `card` |
| Tap another hand card | selection moves (previous drops back, 120ms) | `click` |
| Tap empty area / selected floor card with pick | deselect only if tapping the `hand` zone background; floor background taps do nothing (prevents accidental cancel) | none |

### 3.2 Tap-again flow (commit)
- 0 options: tap again = Drop (hint "Tap again to drop"). `Drop` button also available.
- 1 option: auto-picked on select; tap again = Capture. Buttons: `Capture (n)` enabled.
- >=2 options: nothing is auto-picked; hint "Choose a combination". `Capture` is disabled until a pick matches an option. Tapping the selected hand card again with no matched pick does a **shake** (see 3.5), it does not commit.
- `mustCapture`: if options exist, `Drop` is not rendered (its cell stays empty).

### 3.3 Multi-capture picks
- Picking by option chip: sets `pick` to the chip's ids, chip gets `on` (filled green + check icon), the matching floor cards lift 6px with a green ring and a small badge showing the sum or role (e.g., `K`), connected by a thin line from the selected hand card (optional, `canvas`-free: use an absolutely positioned SVG overlay in `floor`, `pointer-events:none`).
- Picking by floor-card tap: toggles membership in `pick`. When `pick` equals an option, the chip for that option highlights and the `Capture (n)` button enables. When `pick` is a strict subset of any option, the hint says "Keep going: n more" (counts missing cards of the nearest option). When `pick` matches no option and no option contains it, show **invalid** (3.5) and revert the last tap.
- Chip strip auto-scrolls to the matching chip; floor picks auto-select the chip.
- Tap a picked floor card again to remove it from `pick`.
- Tapping `Capture` commits `play(card.id, pick)`.

### 3.4 Turn indicator and timer ring
- **My turn**: my footer avatar gets a gold ring + a one-shot 600ms pulse; the hand rises 6px (translateY, 200ms) from its dimmed rest; screen-edge vignette stays off (too noisy); `hint` becomes active. A short "Your turn" chime + 10ms haptic. In pnp, the hand-off card handles this.
- **Opponent turn**: the seat's avatar gets the gold ring and a rotating arc; the other seats are dimmed to .75.
- **Timer ring**: SVG ring around the active avatar (38px, 3px stroke). `stroke-dasharray` animates from full to 0 over `limit` seconds, **linear**, CSS `animation-duration: var(--limit)`; do not rely on a 1s `setInterval` for the visual (the interval still drives the logic). Colour: gold, then amber at 50%, red at 20%; at <= 5s the ring also pulses (scale 1.0-1.08, 500ms) and a tick sound plays once per second (`sfx('tick')`, haptic on last 3s). Number inside the ring only for the last 5s. Online: start the ring from `deadline - clock` so it matches the server. Timeout counter (`Timeouts n/3`) is a small badge on the avatar, shown from the 1st timeout.
- Bot "thinking": three dots bubble under the avatar (`dots` 1.2s loop) for the 700-1200ms bot delay.

### 3.5 Invalid
- Invalid pick or disabled `Capture`: the hand card **shakes** (`translateX` +-6px, 3 cycles, 220ms) and the hint text flashes red for 600ms (also with an icon prefix `!` so it does not rely on colour). Haptic `error` pattern (20ms,30ms,20ms). Sound `nope`.
- Tapping a floor card with no card selected: the hint blinks "Pick a card first" (no shake).
- Tapping a card when it is not my turn: hand dim label "Opponent's turn" nudges (1 shake of the "X's turn..." label).

---
## 4. Animation choreography

All animations are `transform`/`opacity` only (compositor). Use the Web Animations API (`el.animate`) or CSS classes driven by a small `fx` queue. Durations are defaults; `--fx-speed` multiplier = 0.5 when `FAST` (autopilot/`?fast`) and 0 when reduced motion (see 4.12). Bot move pacing: the next bot's turn starts after the previous play's capture animation ends (play 280 + capture 520 = **~800ms** lock); `FAST` skips animations.
Easings: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-pop: cubic-bezier(.2,1.5,.4,1)`, `--ease-in: cubic-bezier(.5,0,.9,.4)`.

| # | Name | Trigger | Choreography | Duration / easing |
|---|---|---|---|---|
| 4.1 | Deal | New deal (`dealNo` changes) | Stock chip pulses once. Floor cards (4) fly from the stock chip to slots 0-3, staggered 70ms; then each hand card flies from the stock chip into the fan, stagger 80ms, flipping (`rotateY` 180 -> 0) midway. Opponent fan backs fan out from the seat in 60ms stagger. | 320ms each, `--ease-out`; total ~1.1s |
| 4.2 | Hand-in (next round of the same deal) | `hands` replenished, `deal.round` changes | Same as hand part of 4.1, without floor. Round label flips ("Round 3/6") | 260ms, stagger 70ms |
| 4.3 | Play card (hand -> floor arc) | `matchPlay` committed; for opponents, `lastResult.card` | The card is cloned (`position:fixed`) at its source rect (my hand card or the opponent seat's fan top), animates along an arc to the target slot rect: translate via two keyframes with a mid-point lifted 40px above the straight line, scale 1.15 at the apex, back to 1 on landing, rotation settles from +-12deg to 0. Landing: 90ms squash (`scaleY .92` -> 1) + soft shadow ring pulse. Opponent cards flip face-up during the first 100ms. The source card is removed from the hand at t=0 (the fan closes up 250ms). | 280ms, `--ease-out`; landing 90ms |
| 4.4 | Drop (no capture) | `lastResult.captured.length === 0` | Play 4.3 and stay. A `thud` sound; no other FX. | as 4.3 |
| 4.5 | Capture swoosh | `lastResult.captured.length > 0` | After 4.3 lands: the played card + captured floor cards get a 120ms gold flash, then fly to the capturer's pile chip (`data-pile`), stagger 40ms, ease-in, scale 1 -> .35, slight arc towards the pile; each leaves a faint trail (`opacity .4`, 2 ghost frames). On arrival the pile chip bounces (`scale 1.25 -> 1`, 180ms `--ease-pop`) and its count ticks up. Floor slots of the captured cards are free (no other card moves). | 120ms flash + 380ms fly, `--ease-in`; total ~520ms |
| 4.6 | Sur (screen flash + splash) | `lastResult.sur` set | At capture time: 80ms white flash overlay (`opacity .55` -> 0, 220ms) only on the felt/floor (not the whole screen if `reduced`), floor shakes 2 cycles (4px, 180ms) (felt only, cards stay on slots), then the existing `banner` slam ("Sur!" / "Sur Sarbaz!" + points) with a radial gold burst (`conic-gradient` rotating 8s, `opacity` .0-.8-0) behind it and 14 gold particles (`.card-sparkle`) from the floor centre outward. Banner: 0-25% scale 3 -> 1, hold, fade out. Sound `sur`; haptic `heavy`. Play the capture swoosh (4.5) **after** the flash (350ms later) so the player sees which cards formed the sur. | banner 1100ms (existing `slam`), flash 220ms, total ~1.4s; during it, bots wait (lock) |
| 4.7 | Score pops | After a capture (live total changes), `liveScore[u].total` increases | For each increase delta d > 0 by unit: a floating `+d` (bold, gold, 18px, outlined) spawns at the pile chip, rises 24px while flying to the unit's scoreboard live pill (curve), 450ms `--ease-out`, then the pill does `scale 1.3 -> 1` (200ms `--ease-pop`) and its number rolls (digit slide 180ms). Only components that changed are listed (e.g., "+1 A", "+1 J" collapse into one `+2`). A 10 of diamonds / 2 of clubs capture gets a special coloured chip + `sfx('chime')` for 2-3 pts. | 450ms + 200ms |
| 4.8 | Turn change | `deal.turn` changes | Timer ring starts (3.4); previous avatar ring fades 150ms; "Your turn" slides in the hint (translateY 8px -> 0, 150ms). | 150ms |
| 4.9 | Match bar fill | On deal summary dismissal (`mc.scores` change) | Progress bars animate from the old to the new `width`, `transition: width .8s var(--ease-out)`, number counts up (tabular-nums count over 800ms). Leader crown transfers with a 250ms slide if the leader changes. | 800ms |
| 4.10 | VS splash (match start) | First render of a new match (`mc.dealNo === 1`, once per `ctx`, not on resume) | Full-screen overlay `z-index:60`, dimmed backdrop. 0-350ms: my avatar+name slide in from the inline-start edge, opponent(s) from the inline-end edge (mirrored in RTL via `translateX(calc(var(--dir) * 110%))`), `--ease-out`. 350-450ms: "VS" stamp (scale 2.2 -> 1, 40ms shake). 450-1100ms: hold; Goal chip ("First to 65") fades in under the VS. 1100-1400ms: both avatars shrink and fly to their scoreboard cards (match avatar slot), backdrop fades, deal 4.1 starts. 3p: three avatars in a triangle (me bottom), 4p: two team pairs left/right. Tap anywhere skips straight to 1100ms. | ~1.4s total, skippable |
| 4.11 | Deal summary | `mc.phase !== 'playing'` | Modal sheet slides up (translateY 24px + fade, 220ms). Rows reveal one by one (stagger 90ms: clubs, aces, jacks, 10 of diamonds, 2 of clubs, sur, sur sarbaz); each number counts up over 300ms and the winner of the row gets a gold highlight; "This deal" total row pops (`--ease-pop`) with a coin sound per row. "Match total" rolls last. Next-deal button appears after the last row (or after any tap to skip all rows instantly). | rows 90ms stagger, 300ms each, total ~1.5s |
| 4.12 | Win / lose screen | `result` set | **Win**: dim -> sheet scale-in (`--ease-pop`, 320ms); title drops with a bounce; confetti: 60 particles from the top (CSS `@keyframes` on `div`s, random `--x --r --d` set inline, 2.4s fall, `transform` only), trophy icon pops and the **trophy count-up**: `+N` rolls from 0 to N over 900ms with a tick per +1 (cap 12 ticks, haptic `light`), coin payout counts up over 700ms after it, XP bar fills over 600ms; level-up/honour/achievement panels slide in with a 200ms stagger. **Loss**: sheet fades in (200ms), no confetti, title settles with a soft 8px drop, trophy delta (negative) counts down in muted red with a minus icon, "Retry" is the visually primary button. **Draw**: neutral, no confetti. | win ~2.4s; loss ~0.9s |

Stack and timing rules:
- FX are queued per play (`fx` array in a `useRef`); a new bot move is not started until the queue is empty. Humans cannot play during the queue (hand `pointer-events:none`) for at most 800ms, except Sur (~1.4s). Tap during the animation = skip to the end state.
- Never animate `width/height/top/left` on layout elements; the only `width` animation is the progress fill (isolated with `contain:strict` on the track).
- The animated clones live in a portal `div.fx-layer` (`position:absolute; inset:0; pointer-events:none; z-index:25`) to avoid affecting layout.
- Online: apply animations from the `playKey` effect (already present) using `lastResult`; if the player returns/reconnects mid-deal, skip FX and render the state.

### 4.13 Reduced motion
`@media (prefers-reduced-motion: reduce)` and the in-app setting "Reduce motion" (store in `profile.settings.reduceMotion`, default = OS value):
- Replace arcs/flights with 120ms opacity fades at the destination (card appears in its slot; captured cards fade out, pile count ticks without bounce).
- Disable confetti, screen flash, shake, particles, rotating burst, VS slide (show static VS for 700ms), count-up animation (show final value; a 150ms fade).
- Keep: selection lift (no scale) as a 0ms jump + ring, turn ring (static ring, text countdown instead of sweep), banner shown as a static centred fade (no slam, no scale).
- Sur still conveys state via banner + sound + text.

---
## 5. Accessibility and RTL

### 5.1 Accessibility
- **Keyboard** (web/desktop): hand cards are `<button>` in a `role="group" aria-label="Your hand"`; `Left/Right` moves focus within the hand, `Enter/Space` selects then commits (like tap); `Tab` order: score -> hand -> floor cards (when selected) -> options -> buttons -> foot. `Esc` closes the detail/menu/chat. `C` = Capture, `D` = Drop, `1-4` pick hand card.
- **Gamepad**: D-pad/stick = move focus (hand, then floor), `A` = tap, `B` = back/deselect, `X` = Capture, `Y` = Drop, `Start` = menu. Focus order and focus ring are the same as keyboard. Focus ring: 3px gold + 2px dark offset, visible on every card/button.
- **Not colour alone**: team = tint + label + avatar pair; leader = crown icon + text; picks = ring + lift + check badge; hints = glow + (optional) badge dot on capturable cards; invalid = shake + `!` icon + text; timer low = pulse + number + sound; suits use glyph + rank text. Colour-blind palette: `ok` green and `bad` red are paired with icons; test with deuteranopia.
- **Text**: min 11px for dense labels (breakdown), 12px for hint, 13px+ for chips; the user's "Text size" setting scales `rem` and the layout must keep every zone fixed, so text uses `clamp()` and ellipsis rather than growing. At 130% text scale, hide the breakdown row (detail panel only).
- **Screen readers**: live region `aria-live="polite"` announces, per play: "Sara captured 3 cards, 4 points", "Sur!", "Your turn", "Round 3 of 6"; the scoreboard cards are `role="button" aria-expanded` with `aria-label` "You 47 of 65, 12 this deal". Floor cards `aria-label` e.g. "King of spades, selected". Slot positions do not matter to SR (DOM order = fill order sorted by rank).
- **Motion/flash**: no flash faster than 3 per second (Sur flash is a single 220ms event); disabling via reduced motion (4.13). A "Screen flashes" toggle is under the same setting. Confetti is off when reduced.
- **Touch targets** >= 44x44 (cards >= 44 wide by design; chips 30px tall inside a 34px strip -> add 4px invisible padding). Edge swipe from the OS edge is not used by any control (menu is at the top inline-start with 8px inset).
- **Timer**: the turn timer setting (`profile.settings.turnTimer`) includes "Off"; no hidden time pressure. Add "Extra time" (x2) in accessibility settings. Audio cues for timer are optional (haptics as the alternative).
- **Sound**: all sounds are non-essential (every cue has a visual twin). Master and SFX sliders exist (already). Subtitles: bot speech bubbles are the only "dialogue", always visible text for 1.8s (extend to 3s with "Text size" > 120%).

### 5.2 RTL / LTR
- `dir` on `.app` from `useLang()`; all layout uses logical properties and grid column order. Hand fan: fan indices are **visual** (card order: lowest rank at inline-start). Do not mirror card faces: `.card{direction:ltr}` stays (already present), so ranks and suit pips read correctly.
- Floor slot grid: columns are **not** mirrored (positions are a symmetric centre-out fill, so mirroring is meaningless); set `direction:ltr` on `.floor` to keep a stable coordinate system (`--c` is a physical column). Option chips are `direction:ltr` (already) because they contain card labels like `K♠ + 5♥`.
- Seats: **decision: seating is physical, not mirrored.** Play is counter-clockwise (as in current code, `POS` = right, top, left): the next player sits at the physical right, then top, then physical left, in both RTL and LTR. So the `opps` grid is `direction:ltr` and seat `(view+1)` goes in the physical right column. Only text inside seats follows `dir`. Verify 4p pnp order in both languages in QA.
- Directional animation: any horizontal fly-in (VS splash, summary, toasts) uses `--dir: 1` (LTR) / `-1` (RTL) as a multiplier on the X translate. Arcs for card flights use physical coordinates (rects), so they need no mirroring.
- Number format: `n()` (Persian digits in FA) everywhere including the progress numerals; keep `font-variant-numeric: tabular-nums` (Persian digits in the chosen font must also be tabular; test, otherwise fix the width with `min-width:3ch`). The progress bar fills from the inline-start (`transform-origin: inline-start`/`scaleX` with `transform-origin: left` in LTR and `right` in RTL via `[dir=rtl]`).
- Mixed text: names and card labels are wrapped in `<bdi>`; the `+N` pills have `direction:ltr` to keep `+12` from rendering as `12+` in RTL.

---
## 6. Implementation notes and acceptance tests

Order of work: (1) grid + slot floor (fixes bug a), (2) Scoreboard component (bug b), (3) FX layer and the animations in 4 (bug c), (4) accessibility pass.

Acceptance (must pass at 360x640 and 430x932, FA/RTL and EN/LTR, 2/3/4 players):
1. `getBoundingClientRect()` of `.floor`, `.opps`, `.action`, `.hand` is identical across: nothing selected, a card selected with 0/1/many options, a hint line present or absent, the timer on/off, chat open, the scoreboard detail open.
2. While a play is committed, every floor card that stays has the same rect before and after (only the new card and captured cards change).
3. A floor of 20 cards fits with no overlap and no clipped cards; the slot used by a new card is the lowest free index of `FILL_ORDER`.
4. No zone scrolls the page; the options strip is the only horizontal scroller, and the scoreboard detail the only vertical one.
5. With reduced motion on: no transform animations beyond opacity fades; the game stays playable and the result screen shows final numbers.
6. Keyboard-only and gamepad-only complete a full deal.
7. Frame budget: the FX layer sustains 60fps on a mid-range Android (<= 14 simultaneous animated nodes: cap particles to 14 sur / 60 confetti and `will-change: transform` only during the animation).

Follow-ups (out of scope here): sound assets `tick`, `nope`, `thud`, `chime`; haptics wrapper; `reduceMotion` setting in `profile.settings`; a text-size setting if none exists.
