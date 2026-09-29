# MVP plan

What's left before a full game of Acquire can be played start to finish. Items are in the order
to do them. The merge flow (engine fixes and UI) is done and isn't listed here.

## 1. Engine: end game ✅

Done. `gameOver` now ends the game when any hotel reaches 41 tiles or every hotel on the board is
safe. `endGameReducer` pays bonuses, sells every share in hotels on the board at the current price,
returns those shares to the bank, and logs each payout, sale, and final total. Covered by
`endGameOperations.test.ts`, `endGameReducer.test.ts`, and `integration.endGameFlow.test.ts`.

## 2. Client: game over ✅

Done. At game over the player view includes `finalStandings` (everyone's exact money, highest
first) and `GameBoardView` replaces the tiles/action/submit bar with the standings and winner, with
ties sharing a rank. No player card is highlighted once the game is over.

## 3. Client: live updates ✅

Done. `GameBoardView` polls every 3 seconds, skipping while the tab is hidden or a submit is in
flight, and stops at game over. It only replaces the view when the server's `lastUpdated` is newer,
so selections in progress survive and a slow response can't overwrite newer state. The service now
stamps `lastUpdated` on every action (it was only set at creation). Poll failures are silent except
an expired session, which still goes to login.

## 4. Client: buying shares ✅

Done. The buy picker uses the same steppers and hotel chips as the merge UI, shows the cost and the
cash left, and enforces the 3-share, bank, and cash limits with inline errors. It only sends hotels
with a count above zero (the engine rejects zeros). Buying nothing is selected by default, so Submit
reads "Skip buying" until you pick a share. Picks reset every turn. The purchase log now reads
"P0 bought 2 Tower, 1 Luxor" or "P0 didn't buy any shares", before the next turn's entries. Other
players see "Waiting for X to buy shares".

## 5. Engine: unplayable tiles and redrawing ✅

Done.

- A tile that would found a hotel while every hotel is on the board, or merge two safe hotels, is
  rejected with the reason; the hand shows it crossed out with the reason on hover
- At the start of a turn, a hand with no playable tiles is discarded and redrawn (logged). If there's
  still nothing to play the player skips placing a tile and goes to buying; if they can't buy
  either, the turn passes on, and if nobody can play or buy the game ends
- Hands are refilled to 6 at the end of a turn rather than drawing exactly one, so a player who
  skipped placing a tile doesn't overflow
- Also fixed: a tile touching the same hotel on two sides (filling in a corner) started a merger of
  that hotel with itself, and replacing two dead tiles in one turn could draw the same tile twice

## 6. Play a full game against the real server ✅

Partly automated now:

- `service/fullGame.test.ts` plays a tied merger, both stockholders resolving in turn, buying, and
  game over through the HTTP API as two logged-in players, checking each player's view at every
  step. Writing it found and fixed two service bugs: rejected moves returned 200 and were saved
  (they now return 400 with the reason, which the client shows as an error), and the game log was
  never read back (it's now stored one entry per action)
- `client/src/components/__test__/ActionCard.test.ts` and `GameBoardView.test.ts` render the real
  components under happy-dom and cover default actions, picks resetting between turns, the
  Submit/Skip label, waiting states, disabled tiles, game over, and polling

Played in a browser against the real server with two players (separate sessions on `localhost` and
`127.0.0.1`, scratch database): create, join, and start a game, found a hotel, buy shares, then a
seeded end game through a tied merger, both stockholders resolving, buying, and game over. Polling,
the game log, and final standings all matched between the two players. Fixed along the way: the
action bar covered the bottom row of the board below about 570px wide (the board now sizes from
square cells).

Small things noticed, not blocking:

- Polling pauses in background tabs, so returning to a tab can take up to 3 seconds to catch up;
  polling immediately on `visibilitychange` would fix it
- The dashboard cuts off long game names, and the game card's three buttons overflow it when narrow
- Submit reads "Submit" (disabled) while waiting for players; "Waiting…" would be clearer
- The log includes engine detail lines like "Minority bonus paid to single minority shareholder"
- Each player's log starts from their own first action, so the moves just before it are hidden

## Not needed for MVP

- The game ends automatically instead of a player declaring it; fine as a simplification
- From `TODO.md`: light/dark mode, `ky`, general layout, better game ids, confirmation dialogs,
  db abstraction, 3D tiles, player colors, collapsible game card, create/join prompts
