# TO DO

## Client general

1. fix light/dark mode over every screen
2. improve layout

- Put the unicode characters for hotels on the tiles when they are founded?
- we need to enforce types on the api calls

## Action Card

- export css parameterized strings from the template files rather than the inline styles

## Dashboard

- make the time calculation work right, and add "updated" or "created".
  - `lastUpdated` now changes on every move (it was only set at creation), so this may already work
- long game names are cut off, and the game card's three buttons overflow it on narrow screens
- leaderboard: total $ per player across finished games
  - final money is already computed at game over (`finalStandings`); it would need saving per player (e.g. a KV entry per player) when a game ends
- make the join/etc. buttons styled links
- create game states for 6/6 players, playing/other owner/etc
- join/delete/start game -confirmation dialog
- before game has started, players can leave, confimation dialog

## Game Board

- put the hotel type (economy, standard, luxury) on the bank card as well as the lowest price when inactive
- make the board squares more 3D? They look very flat right now.
- game card somewhere on screen? Could make it collapsible/hidable.
- a game status somewhere, e.g. "Waiting for players", "Player X's turn", "Waiting for player X to sell/trade stocks", "Game over"
  - partly there: the action card shows waiting messages and game over shows the winner, but there's no single status line
- Submit reads "Submit" (disabled) while waiting for players; "Waiting…" would be clearer
- polling pauses in background tabs, so returning to a tab can take up to 3 seconds to catch up; poll immediately on `visibilitychange`
- the game log includes engine detail lines like "Minority bonus paid to single minority shareholder"
- each player's log starts from their own first action, so the moves just before it are hidden
- give players unique colors?

## Misc

- should we have a db layer abstraction? Probably overkill for now, but it seems a bit overloaded in routes, plus it would enable easier swapping of dbs later.
- is it really worth it to have playerview hotels as a map? It seems like all I do on the client is convert it to an array for manipulation/display
  - the client looks hotels up by name in four places (merge pickers, your holdings) and iterates them in two (bank cards, buy picker), which need `Object.entries` plus a cast; it also recalculates share prices in four places. Keep the map, add a typed iteration helper, and include each hotel's price and type in the view
- the unit tests for hoteloperations somehow missed the getAvailableHotelNames logic being backwards-- fixing it didn't make anything fail either.
- it's dumb I say an action is the proper type, but then I have to set type in the action. I should be able to do something like

```typescript
function createAction<T extends string, P>(type: T, payload: P): { type: T; payload: P } {
  return { type, payload };
}
```

- many of the actions have "player" as the payload, but the server could get that from the auth cookie. Is there really a need to send it? Maybe the service can add it? Of course then I can't really use the action type in the client, since it will be missing the proper payload...
- root deno.json should have a task to run the client in dev mode, too
- better game ids, something like they do for docker instances on desktop
- prompts on create/join game?
- test request failures-- does client display an error?
  - rejected moves now return 400 and the client shows the reason as an error toast; there's no UI test for it yet
- add at least a debug view where the api server logs requests and responses
- local dev hot reload doesn't seem to be working
- import Pico and Toastify's CSS from npm instead of the copies
- light DOM for the top-level views, so one Pico stylesheet applies?
- stale member lockfiles, duplicate `hono`/`@std/testing` entries, and client `preview`/`deploy` tasks for files that don't exist

## Eventual blog post

See `blog/outline.md`, which also keeps the original notes from this section.
