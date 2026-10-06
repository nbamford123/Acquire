# TO DO

## Dashboard

- leaderboard: total $ per player across finished games
  - final money is already computed at game over (`finalStandings`); it would need saving per player (e.g. a KV entry per player) when a game ends

## Misc

- should we have a db layer abstraction? Probably overkill for now, but it seems a bit overloaded in routes, plus it would enable easier swapping of dbs later.

## Eventual blog post

See `blog/outline.md`, which also keeps the original notes from this section.
