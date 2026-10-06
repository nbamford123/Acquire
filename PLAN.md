# Plan

The remaining work, in the order to do it. Check tasks off as they're done, and remove them from
`TODO.md` at the same time so the two don't drift. Sizes are rough: S under an hour, M a few hours,
L a day or more.

Done so far: a complete game plays start to finish in production (merge flow, end game and scoring,
live updates, buying and skipping, unplayable tiles), with CI running formatting, lint, types, and
241 tests on every PR, and a pre-commit hook (`deno task hooks`). Details are in the history of
#20 and #21. Phase 1 (#27 and #28) then made Lit properties reactive with standard decorators, ran
the tests against in-memory KV, let only a game's owner delete it, removed `/api/save/:id`, saved
each move in one atomic commit with a versionstamp check, moved the deploy settings into
`deno.json`, removed the dead CORS setup, added a daily cron that deletes games inactive for 30
days, and minified the production bundle.

## Phase 1: Production hardening

Done in #27 and #28, except one dashboard setting:

- [x] Set `ALLOWED_EMAILS` and `JWT_SECRET` in the Development context on Deno Deploy, so you can
      log in on preview and branch deploys. Use a different `JWT_SECRET` from production. Preview
      timelines get their own KV database, so testing there doesn't touch production games (S)

## Phase 2: Clarity while playing

One PR.

- [x] A game status line: "Alice's turn", "Waiting for Bob to sell or trade", "Game over". Parts
      exist (the active player's card is highlighted, the action card shows waiting messages, and
      game over has a headline), but nothing says it in one place (M)
- [x] Poll immediately when a tab becomes visible, instead of up to 3 seconds later; today polling
      only skips while the tab is hidden (S)
- [x] Game log: show what happened since the player's last turn, since that's what it's for in an
      asynchronous game. Today `getPlayerView.ts` keeps the current and previous rounds
      (`currentTurn` counts rounds, not player turns), so it shows about two rounds whatever the
      player count. Actions are plain text with a round number, so the view can't tell whose turn
      each one belongs to; record that (e.g. a player index on `PlayerAction`), then start the log
      at the player's last turn so they see what they did and everything since. Also drop engine
      detail lines like "Minority bonus paid to single minority shareholder" (from
      `calculateShareholderPayoutsOperation.ts`). The log is a `<select>` today, so consider a
      real list while you're there (M)
- [x] Dashboard game card: the buttons overflow on narrow screens (the card has
      `min-width: 400px`), and label the time, e.g. "Updated 4:29 PM"; it already shows the last
      move's time (S)

## Phase 3: Lobby flow

- [x] Make the join/start/delete/play buttons styled links (S)
- [x] Confirmation dialogs for join and start; delete already has one (S–M)
- [x] Players can leave a game before it starts, with a confirmation. The engine already handles
      `REMOVE_PLAYER`, so this needs the route and the UI (M)
- [x] Dashboard states for full (6/6) games and games owned by others. A full game already shows
      "View Game" instead of "Join Game", and only the owner sees Delete; what's missing is a
      "Full" status (S)
- [x] Friendlier game ids, like Docker's generated names. That also fixes the cut-off names: the
      game card shows only the first 8 characters of today's ids (S)
- [x] Decide whether creating or joining needs a prompt: no, the join and start confirmations
      cover it (S)
- [x] Let anyone view a game they're not in. Spectators see what players see about each other
      (cash tiers, rough share counts, the board), so nothing hidden leaks. `getPlayerView` throws
      for non-players and `PlayerView` assumes a seat (`playerId`, `money`, `stocks`, `tiles`), so
      add a spectator view with no seat and every player shown as another player. Its log can use
      the same filter with the current player in place of "you", which shows the last full round.
      On the board, skip the hand, action card, and Submit, and show every player card as another
      player. Then drop the 403 on `GET /api/games/:id` for non-players and bring back a View Game
      link on their dashboard cards (M)

## Phase 4: Look and feel

Do the first two before the rest, since they change how every component gets its styles. Then the
accessibility pass, the light/dark toggle, and the layout pass, in that order: the toggle needs the
colors fixed for both themes, and the layout pass is easier with both themes working.

- [x] Import Pico and Toastify's CSS from npm instead of `client/src/pico-styles.ts` and the copies
      in `client/public` (`with { type: 'text' }` works in `deno bundle` now), and build the Pico
      stylesheet once instead of once per component (S)
- [x] Decide whether the top-level views (login, dashboard, board) render without shadow DOM:
      yes, and every component does now, via `LightComponent`
      (`createRenderRoot() { return this; }`), so one page-level Pico stylesheet applies and
      `StyledComponent` goes away. That makes light/dark mode and the layout pass simpler; the cost
      is prefixing component selectors and updating the tests that use `shadowRoot`. Pico's theme
      selectors match the page root (`:root`, `[data-theme]` on `<html>`), which a shadow root's
      copy of Pico can't see, so the toggle below is much simpler with light DOM (M)
- [x] Accessibility pass. In light mode some hotel cards are nearly unreadable: the bank cards keep
      dark backgrounds while their text switches to light mode's dark color, so hotel names
      disappear, and the share chips on other players' cards have the same problem. Check every
      hotel color for text contrast (WCAG AA, 4.5:1) in both themes, and also check keyboard use
      (board cells are `<div>`s with click handlers), visible focus, and labels for anything shown
      only by color or icon (M)
- [x] Light/dark toggle in the header. It defaults to the system preference and remembers a choice
      per browser; Pico switches with `data-theme` on `<html>`. Replaces the per-component
      `prefers-color-scheme` rules, which only AppShell and GameCard have today (M)
- [x] Layout pass at phone and tablet sizes: iPhone 13 portrait (390×844) and landscape (844×390),
      and a tablet at 768×1024 and 1024×768. At 390 wide, the header wraps "← Back to Games" onto
      three lines and the board page scrolls sideways by a few pixels; in phone landscape, your
      tiles and Submit sit below the board, off screen. Tablet portrait looks fine. Add a check
      for sideways scrolling at each size to the tests if it's practical (M–L)
- [x] Bank cards show what the physical game's information card would: the hotel type (economy,
      standard, luxury), the majority and minority bonuses (10× and 5× the share price; the engine
      has `majorityMinorityValue`), and "Safe" at 11 or more tiles. The price already shows,
      including the lowest price for inactive hotels; the player view change in Phase 5 would
      provide the type. This replaces a separate reference card: the only thing that card adds is
      the full price ladder, and a "next price at size N" line could cover that if it's missed (S)
- [x] Hotel markers on the board: one tile per hotel, the one that founded it, shows its icon
      in place of the label, like the physical game's chain markers (S)
- [x] Less flat, more 3D-looking board squares (S)
- [x] Move the inline styles into CSS: six in the action card and its templates (exported from the
      template files), and a few in GameBoardView (S)

## Phase 5: Code health and developer experience

None of these change what players see; pick them up whenever.

- [x] API client: typed API calls, a `createAction` helper instead of setting `type` by hand, and
      taking the player from the login rather than the action payload (M)
- [x] Player view hotels: keep the map, but add a typed helper for iterating it (today two places
      need `Object.entries` plus a cast) and include each hotel's price and type in the view (the
      client recalculates prices in four places). An array would simplify the loops but make the
      four lookups by name clumsier (S–M)
- [x] Add the missing `getAvailableHotelNames` test (S)
- [x] A GameBoardView test for a rejected move showing its error; the ApiService tests check that
      the error event is sent, but nothing checks the board (S)
- [x] Root task to run the client in dev mode, and fix local hot reload: `deno bundle --watch` next
      to the service's `--watch` can replace `client/dev-server.ts`, and the live-reload script in
      `index.html` is commented out (S–M)
- [x] Config cleanup: delete the stale `client/deno.lock` and `service/deno.lock` (a workspace only
      uses the root lock), drop the duplicate `hono` and `@std/testing` entries in the member
      `deno.json` files, remove the client's `preview` and `deploy` tasks (their files don't exist),
      drop `--unstable-kv` from the `dev` task since `deno.json` already sets it, and exclude
      `client/dist` from `deno check`, which type-checks the bundle whenever a local build
      exists (S)
- [x] Small cleanups: the class in `GameCard.ts` is named `DashboardView`, GameBoardView imports
      `GamePhase` by relative path instead of from `@acquire/engine/types`, and leftover debug
      `console.log`s remain in GameBoardView, AppShell, DashboardView, and ApiService (S)
- [x] Break merger ties by player id rather than name, and domain prefixes for error codes (from
      `TODO(me)` comments) (S)
- [x] Server debug view of API requests and responses (M)

## Phase 6: Leaderboard

Its own PR, done last.

- [x] Save each player's final money when a game ends and keep running totals, e.g. a KV entry per
      player; `finalStandings` already has the numbers. Also counts games played and won (M)
- [x] An endpoint for the totals and a leaderboard on the dashboard. `service/fullGame.test.ts`
      already plays to game over and checks `finalStandings`, so extend it to check the totals (M)

## After the plan

- [x] Re-assess the stack against `assessments/stack.md`: Deno, Lit, and Deno Deploy all move
      quickly, so recheck its claims and update the blog outline in `blog/outline.md`

## Upkeep from the recheck

From the 2026-10-06 recheck in `assessments/stack.md`. Each is its own small PR.

- [ ] Update Hono to 4.13.13 (fixes a `serveStatic` advisory this app isn't exposed to) and import
      `serveStatic` from `@hono/deno`, since `hono/deno` is deprecated. Also update Lit to 3.3.3 and
      `@std/testing` to 1.0.21, and let the lock regenerate, which drops its dead entries (S)
- [ ] Define the 8 Pico colors the client uses instead of bundling all of `pico.colors.min.css`
      (75 KB), taking the bundle from 276 KB to about 201 KB minified (S)
- [ ] Point every test's assertions at the mapped `@std/assert` (21 engine test files import
      `deno.land/std@0.203.0` by URL, 18 import `jsr:@std/assert` inline), and add `@zaubrik/djwt`
      to the import map (S)

## Not planned

- A database layer abstraction: little benefit at this size
- Switching the API client to ky: plain `fetch` plus the polling timer already covers what it would
  add
- Player colors: the highlighted card for the player who needs to act, and the status line, already
  show whose move it is
