Status: partial. Only the Decisions and Open questions sections are approved by the user (2026-11-15). All other sections are still to be written.

# Chaharbarg (Pasur): product brief

## Summary
_To be written._

## Problem
_To be written._

## Users
_To be written._

## Goals and success criteria
_To be written._

## Non-goals
_To be written._

## Key scenarios
_To be written._

## Constraints
_To be written._

## Open questions
- Does the starting player rotate in later deals? The build rotates; keeping it unless told otherwise. Decider: the user.
- Does the employer expect online play (accounts, friends, rankings, public chat)? It needs a server and is a separate project from the offline game. Decider: the user and the employer.

## Decisions
Rules, confirmed by the user on 2026-11-15 (answers to the questions Claude asked after the first release):
1. Sur Sarbaz is worth 10 points.
2. Clubs need 7 or more. In a 3-player game, if two players tie for the most clubs, the third player gets the 7 points.
3. A player who can capture must capture, and chooses the card and the combination. A player who cannot capture must drop a card on the floor.
4. The last player to capture takes the cards left on the floor at the end of the deal.
5. A match ends at a target score chosen by the players: 35 or 65 for 2 and 3 players, 65 or 112 for 4 players. (Current build uses 62 / 100 / single deal: needs changing.)
6. The first player is chosen at random; play goes counterclockwise. (Current build rotates the dealer: needs changing for the first deal.)
7. A jack on the opening floor means the deal is redone. The "4, 4, 4" example in the source document was a typo for "4, 4, 3".
8. The 50-point sur cap is removed entirely: sur always scores in full, at every match target. Decided by the employer, relayed by the user on 2026-11-15. (Current build has the cap on by default and as a house-rule toggle: needs removing.)

Scope: the employer's 15 requested items have no priority from him; they are sorted against the existing plan in the backlog. Items needing a server (online play, friends, public chat, rankings) are treated as a later, separate project.
