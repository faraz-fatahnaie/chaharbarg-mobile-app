# XP and levels

A review document. Every value is a named constant in `apps/mobile/src/economy/economy.ts`, so the numbers can change without changing the logic. XP is computed by the pure function `matchXp`.

## Values

| Name | Value | Meaning |
|---|---|---|
| `XP_FINISH` | 20 | any finished match (win, loss, draw) |
| `XP_WIN` | 30 | win (the team counts as the winner in 4p) |
| `XP_BIG_MARGIN` | 20 | win with margin ≥ `bigMarginAt(target)` |
| `XP_SUR` | 5 | per sur |
| `XP_SARBAZ` | 10 | per sur sarbaz |
| `XP_SUR_CAP` | 50 | max sur + sarbaz XP in one match |
| `XP_QUIT` | 40 | taken away on forfeit |
| `BIG_MARGIN_SHARE` | 0.25 | `bigMarginAt(t) = ceil(t × 0.25)` |

Margin is the player's unit score minus the best other unit's score at match end (0 when not a win).

Big-margin thresholds: target 35 → 9, 62 → 16, 65 → 17, 100 → 25, 112 → 28.

## Level curve

Unbounded. Level L starts at `10·(L−1)·(L+8)` XP. The step from L to L+1 costs `100 + 20·(L−1)`, so each level costs 20 XP more than the one before.

| Level | XP |
|---|---|
| 2 | 100 |
| 3 | 220 |
| 5 | 520 |
| 10 | 1,620 |
| 20 | 5,320 |
| 30 | 11,020 |
| 50 | 28,420 |
| 100 | 106,920 |

At about 45 XP per match, that is roughly 2–3 matches for level 2, about 4 matches per level around level 5, and about 11 matches per level around level 20 (the step there is 480 XP).

## Forfeit

Only the explicit Forfeit in a bots match counts. "Save and go home", closing the app and the pass-and-play Discard do not. Pass-and-play gives no XP.

A forfeit takes 40 XP, but XP never goes below 0 and never below the start of the current level. So a forfeit can never lower the level, and the level-up Gohar cannot be farmed.

## Worked examples

- 2p win at target 62, 70–50, 1 sur and 1 sur sarbaz: 20 + 30 + 20 + 5 + 10 = **85**.
- Loss with 2 surs: 20 + 10 = **30**.
- Forfeit at 650 XP (level 5 starts at 520): **610**.
- Forfeit at 530 XP: **520**, level kept.
- Forfeit at 0 XP: **0**.

## Existing players

Stored XP is kept and the level is recalculated with the new curve. No Gohar is paid for levels gained by the recalculation. For example, 4,860 XP was level 10 under the old curve and is level 19 now.
