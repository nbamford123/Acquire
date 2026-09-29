# Plan

The remaining work, in the order to do it. Check tasks off as they're done, and remove them from
`TODO.md` at the same time so the two don't drift. Sizes are rough: S under an hour, M a few hours,
L a day or more.

Done so far: a complete game plays start to finish in production (merge flow, end game and scoring,
live updates, buying and skipping, unplayable tiles), with CI running formatting, lint, types, and
234 tests on every PR, and a pre-commit hook (`deno task hooks`). Details are in the history of
#20 and #21.

## Phase 1: Production hardening

The site is live, so these come first. Two PRs: the Lit fix on its own, then the rest. Background
for most of these is in `assessments/stack.md`.

- [ ] Fix Lit reactive properties. Deno ignores `useDefineForClassFields`, so class fields hide Lit's
      accessors, whether they're declared with decorators or `static properties`; that's why the
      code needs manual `requestUpdate()` calls. It also causes a bug: after deleting a game, the
      dashboard still shows it and drops another, because `GameCard.game` isn't reactive. Switch
      to standard decorators (`@property() accessor x`, `@state() accessor x`), remove
      `experimentalDecorators` and `emitDecoratorMetadata` (which also clears the deprecation
      warning), and delete all 12 manual `requestUpdate()` calls (AppShell 4, GameBoardView 5,
      LoginView 2, DashboardView 1). Each one follows an assignment to a property that becomes
      reactive, so none are needed. Add a dashboard test that deletes a game (M)
- [ ] Run tests against in-memory KV (`KV_PATH=:memory:` in the `check` and `validate` tasks) and
      un-ignore the two ignored route tests, which pass that way (S)
- [ ] Only a game's owner can delete it; today anyone signed in can delete any game (S)
- [ ] Remove the temporary `/api/save/:id` endpoint, marked "remove before production"; it writes
      game state to the server's disk (S)
- [ ] Save each move in one atomic KV commit that checks the game's versionstamp, so two submits
      can't overwrite each other and the state and its actions are always saved together; also
      stop reading the whole action log just to count it (S–M)
- [ ] Replace the old deployctl `"deploy"` block in `deno.json` with the new Deno Deploy format
      (`install`, `build`, and `runtime` with `entrypoint` and `cwd`), so the deploy settings live
      in the repo instead of only in the dashboard. Settings in `deno.json` override the dashboard,
      so try it on a preview deploy first (S)
- [ ] Remove the CORS setup in `service/main.ts`: it names a `.deno.dev` host that no longer
      resolves, it's registered after the routes so it only affects preflight requests, and the
      client is served from the same origin (S)
- [ ] Delete games after a period of inactivity so the production database doesn't only grow; pick
      the cutoff, e.g. 30 days since `lastUpdated`. `Deno.cron` on Deno Deploy can run the sweep (M)

## Phase 2: Clarity while playing

One PR.

- [ ] A game status line: "Alice's turn", "Waiting for Bob to sell or trade", "Game over" (M)
- [ ] Submit reads "Waiting…" while waiting for players (S)
- [ ] Poll immediately when a tab becomes visible, instead of up to 3 seconds later (S)
- [ ] Game log: drop engine detail lines like "Minority bonus paid to single minority shareholder",
      and show recent turns instead of starting from the player's own first action (M)
- [ ] Dashboard: long game names are cut off, the game card's buttons overflow when narrow, and
      confirm the time display works now that `lastUpdated` changes on every move (S)

## Phase 3: Lobby flow

- [ ] Make the join/start/delete/play buttons styled links (S)
- [ ] Confirmation dialogs for join, delete, and start (M)
- [ ] Players can leave a game before it starts, with a confirmation (M)
- [ ] Dashboard states for full (6/6) games and games owned by others (S)
- [ ] Friendlier game ids, like Docker's generated names (S)
- [ ] Decide whether creating or joining needs a prompt (S)

## Phase 4: Leaderboard

Its own PR.

- [ ] Save each player's final money when a game ends and keep running totals, e.g. a KV entry per
      player; `finalStandings` already has the numbers (M)
- [ ] An endpoint for the totals and a leaderboard on the dashboard, with a service test that plays
      to game over and checks them (M)

## Phase 5: Look and feel

Do the first two before the rest, since they change how every component gets its styles.

- [ ] Import Pico and Toastify's CSS from npm instead of `client/src/pico-styles.ts` and the copies
      in `client/public` (`with { type: 'text' }` works in `deno bundle` now), build the Pico
      stylesheet once instead of once per component, and add `--minify` to the build (S)
- [ ] Decide whether the top-level views (login, dashboard, board) render without shadow DOM
      (`createRenderRoot() { return this; }`), so one page-level Pico stylesheet applies and
      `StyledComponent` goes away. That makes light/dark mode and the layout pass simpler; the cost
      is prefixing component selectors and updating the tests that use `shadowRoot` (M)
- [ ] Light/dark mode on every screen (M)
- [ ] General layout pass (M–L)
- [ ] Hotel type (economy, standard, luxury) and price on the bank cards, including inactive hotels;
      see the player view change in Phase 6, which provides both (S)
- [ ] Hotel icons on founded tiles (S)
- [ ] Player colors (S–M)
- [ ] Collapsible game card on the board (S)
- [ ] Less flat, more 3D-looking board squares (S)
- [ ] Move the action card's inline styles into CSS exported from the template files (S)

## Phase 6: Code health and developer experience

None of these change what players see; pick them up whenever.

- [ ] API client: typed API calls, a `createAction` helper instead of setting `type` by hand, and
      taking the player from the login rather than the action payload (M)
- [ ] Player view hotels: keep the map, but add a typed helper for iterating it (today two places
      need `Object.entries` plus a cast) and include each hotel's price and type in the view (the
      client recalculates prices in four places). An array would simplify the loops but make the
      four lookups by name clumsier (S–M)
- [ ] Add the missing `getAvailableHotelNames` test (S)
- [ ] UI test for a rejected move showing its error (S)
- [ ] Root task to run the client in dev mode, and fix local hot reload: `deno bundle --watch` next
      to the service's `--watch` can replace `client/dev-server.ts`, and the live-reload script in
      `index.html` is commented out (S–M)
- [ ] Config cleanup: delete the stale `client/deno.lock` and `service/deno.lock` (a workspace only
      uses the root lock), drop the duplicate `hono` and `@std/testing` entries in the member
      `deno.json` files, remove the client's `preview` and `deploy` tasks (their files don't exist),
      and drop `--unstable-kv` from the `dev` task since `deno.json` already sets it (S)
- [ ] Break merger ties by player id rather than name, and domain prefixes for error codes (from
      `TODO(me)` comments) (S)
- [ ] Server debug view of API requests and responses (M)

## After the plan

- [ ] Re-assess the stack against `assessments/stack.md`: Deno, Lit, and Deno Deploy all move
      quickly, so recheck its claims and update the blog outline in `blog/outline.md`

## Not planned

- A database layer abstraction: little benefit at this size
- Switching the API client to ky: plain `fetch` plus the polling timer already covers what it would
  add
