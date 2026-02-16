# TO DO

## Client general

1. fix light/dark mode over every screen
2. update to [ky](https://github.com/sindresorhus/ky), cleaner syntax, retries, good interface for polling, and add polling!
3. improve layout
4. Finish/test other actions
   - trade stocks
   - sell stocks
   - merge hotel(s)
   - pass buyng stocks
   - end game

- check pr validation
- Put the unicode characters for hotels on the tiles when they are founded?
- we need to enforce types on the api calls

## Action Card

- export css parameterized strings from the template files rather than the inline styles

## Dashboard

- make the time calculation work right, and add "updated" or "created".
- should the join/etc. buttons actually be styled links?
- create game states for 6/6 players, playing/other owner/etc
- join/delete/start game -confirmation dialog
- before game has started, players can leave, confimation dialog

## Game Board

- put the hotel type (economy, standard, luxury) on the bank card as well as the lowest price when inactive
- make the board squares more 3D? They look very flat right now.
- game card somewhere on screen? Could make it collapsible/hidable.
- a game status somewhere, e.g. "Waiting for players", "Player X's turn", "Waiting for player X to sell/trade stocks", "Game over"
- give players unique colors?
- submit button should be disabled until they've performed a valid action (possible exception: you don't _have_ to buy stocks)

## Misc

- should we have a db layer abstraction? Probably overkill for now, but it seems a bit overloaded in routes, plus it would enable easier swapping of dbs later.
- ignoring a couple of tests because test games are throwing them off
- pass turn? Is that allowed if you can play?
- is it really worth it to have playerview hotels as a map? It seems like all I do on the client is convert it to an array for manipulation/display
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
- the client needs to check response codes and for game engine errors. Probably need a central handler (note the auth service does this)
- test request failures-- does client display an error?
- pre-commit hook? Is that even possible?
- add at least a debug view where the api server logs requests and responses
- local dev hot reload doesn't seem to be working
- end game
- pass or no stocks in buy stocks phase (have money but don't want to buy stocks)
- ttl/culling of old games

## Eventual blog post

- the workspace thing lets me inherit fmt and stuff, which is awesome
- had trouble with tw and deno bundling. What?
- some decorators don't work with deno bundling-- `@state` in particular. How did I test/verify that? Also `@property` requires manual updating
- DOM testing was a total fail from `deno-dom` to `happy-dom` to `puppeteer` and even `@open-wc/web-test-runner`. Lit just isn't compatible running through deno. Stand along node testing would be required
- pulling in picocss via typescript file is a bit weird, but it works. Also had to add the css files for pico and toastify to the repo because deno bundle doesn't do remote imports
