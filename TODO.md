# TO DO

## Dashboard

- leaderboard: total $ per player across finished games
  - final money is already computed at game over (`finalStandings`); it would need saving per player (e.g. a KV entry per player) when a game ends

## Misc

- should we have a db layer abstraction? Probably overkill for now, but it seems a bit overloaded in routes, plus it would enable easier swapping of dbs later.
- is it really worth it to have playerview hotels as a map? It seems like all I do on the client is convert it to an array for manipulation/display
  - the client looks hotels up by name in four places (merge pickers, your holdings) and iterates them in two (bank cards, buy picker), which need `Object.entries` plus a cast; it also recalculates share prices in four places. Keep the map, add a typed iteration helper, and include each hotel's price and type in the view
- add at least a debug view where the api server logs requests and responses
- the class in `GameCard.ts` is named `DashboardView`
- GameBoardView imports `GamePhase` by relative path instead of from `@acquire/engine/types`
- leftover debug `console.log`s in GameBoardView, AppShell, DashboardView, and ApiService

## Eventual blog post

See `blog/outline.md`, which also keeps the original notes from this section.
