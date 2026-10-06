# TO DO

## Client general

1. fix light/dark mode over every screen (only the app shell and game card handle it)
2. improve layout

- Put the unicode characters for hotels on the tiles when they are founded? (the bank cards have them)
- we need to enforce types on the api calls

## Action Card

- export css parameterized strings from the template files rather than the inline styles

## Dashboard

- leaderboard: total $ per player across finished games
  - final money is already computed at game over (`finalStandings`); it would need saving per player (e.g. a KV entry per player) when a game ends

## Game Board

- let non-players view a game (spectator view: no hand or controls, the last full round in the log)
- put the hotel type (economy, standard, luxury) on the bank card (the price already shows, including when inactive)
- make the board squares more 3D? They look very flat right now.
- game card somewhere on screen? Could make it collapsible/hidable.
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
- test request failures-- does client display an error?
  - rejected moves now return 400 and the client shows the reason as an error toast; there's no UI test for it yet
- add at least a debug view where the api server logs requests and responses
- local dev hot reload doesn't seem to be working
- import Pico and Toastify's CSS from npm instead of the copies
- light DOM for the top-level views, so one Pico stylesheet applies?
- stale member lockfiles, duplicate `hono`/`@std/testing` entries, and client `preview`/`deploy` tasks for files that don't exist
- `deno check` type-checks `client/dist/bundle.js` whenever a local build exists
- the class in `GameCard.ts` is named `DashboardView`
- GameBoardView imports `GamePhase` by relative path instead of from `@acquire/engine/types`
- leftover debug `console.log`s in GameBoardView, AppShell, DashboardView, and ApiService

## Eventual blog post

See `blog/outline.md`, which also keeps the original notes from this section.
