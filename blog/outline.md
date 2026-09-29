# Blog post outline: a full-stack app in nothing but Deno

A sketch based on `assessments/stack.md` (2026-09-29). **Verified** points were checked in the repo
or reproduced. **To check** points need your memory or a quick look before they go in the post.
Update this after the plan is done, especially the Lit section, which should end with the fix
applied.

## Working title options

- "Nothing but Deno: a board game, start to finish"
- "What I blamed on Deno, and what it actually was"
- "Full-stack Deno in 2026: a year of building Acquire"

## The pitch (intro)

- Couldn't find anyone writing about using Deno as the _whole_ stack: shared game engine, API
  service, browser client, tests, bundling, database, and hosting, with no `package.json` and no
  `node_modules`.
- The result: the board game Acquire, playable start to finish in production.
- The post's angle: an honest year-long log. Some early complaints were real limits, some were my
  mistakes, and some were fixed by Deno since. Readers get the working setup _and_ the traps.

## 1. The shape of the project

- One repo, a Deno workspace with three members:
  - `engine`: pure game logic (actions, reducers, orchestrators), about 2,750 lines with 6,800 lines
    of tests
  - `service`: Hono API on Deno Deploy with Deno KV, about 400 lines
  - `client`: Lit web components bundled with `deno bundle`, about 2,900 lines
- The engine is shared by the service and the client through workspace import-map names
  (`@acquire/engine/types`, `@acquire/engine/utils`). There's no package to publish or build step
  for it.
- A diagram would help here: engine in the middle, service and client both importing it, KV and
  Deploy behind the service.

## 2. What worked from day one

- **Workspace config inheritance.** One `fmt` and `lint` config at the root; the member `deno.json`
  files are 3–20 lines. (Your original note: "the workspace thing lets me inherit fmt and stuff,
  which is awesome.")
- **One toolchain.** `deno task check` is fmt, lint, type check, and tests, and it's the same
  command in CI and the pre-commit hook. No ESLint, Prettier, Jest, or tsc configs.
- **Fast tests.** 234 tests across all three packages in a couple of seconds (engine 194 in 0.9 s).
- **Testing the API without a server.** Hono's `app.fetch(new Request(...))` lets
  `service/fullGame.test.ts` play the end of a game over HTTP as two logged-in players, with no
  port or network.
- **KV for game state.** Everything is looked up by game id. Snippet: the `dataLayer.ts` functions
  are a few lines each.

## 3. Pain points: then and now

This is the core of the post. For each one: what I wrote at the time, what was really going on, and
where it stands now.

### 3.1 "Some decorators don't work with deno bundling" (the big one)

- **Then:** "`@state` in particular… Also `@property` requires manual updating." I replaced
  `@state()` with `static properties` (`96a3477`, `3e5418b`) and added manual `requestUpdate()`
  calls (12 of them, all removable once the properties are reactive).
- **Actually (verified):** not bundling. Deno ignores `useDefineForClassFields`; it prints "The
  following options were ignored". TypeScript class fields therefore use define semantics and
  create an own property on each instance, which hides the getter/setter Lit installs. Lit's docs
  tell you to set that option to `false`; in Deno you can't.
- **Why switching to static properties didn't help:** the field initializers stayed
  (`private loading = false`), and even an uninitialized declaration (`private count?: number`)
  hides the accessor. Only `declare` plus assigning in the constructor worked, which is the pattern
  `ActionCard` ended up with.
- **It shipped a bug (verified):** deleting a game on the dashboard left the deleted game showing
  and dropped another one. Lit reused the `<game-card>` elements, and `game` was a plain field, so
  the cards never redrew.
- **The fix:** standard decorators with `accessor` (`@state() accessor count = 0`), without
  `experimentalDecorators`. It works in `deno run`, `deno test`, and `deno bundle`, and it removes
  the deprecation warning too.
- **Show:** the minimal repro component and the results table from the assessment (each pattern,
  reactive or not, under `deno run` and in the bundle).
- **To check / update after Phase 1:** the before/after (manual `requestUpdate()` count, bundle
  size change) and the delete test.

### 3.2 "DOM testing was a total fail"

- **Then:** "from `deno-dom` to `happy-dom` to `puppeteer` and even `@open-wc/web-test-runner`. Lit
  just isn't compatible running through deno."
- **Now (verified):** happy-dom 20 renders Lit under `deno test`. 25 client tests run in about half
  a second.
- **The one trick:** happy-dom replaces the global `dispatchEvent`, `addEventListener`, and
  `removeEventListener` with versions that reject Deno's own `Event` objects, which breaks the test
  runner. Keep Deno's. Show all of `client/src/components/__test__/dom.ts`; it's 12 lines.
- **To check:** which versions failed back then, and how. The attempts were never committed, so git
  history can't answer it. Was it happy-dom before 20, or the event-method problem the whole time?
  Honest either way.
- **Caveat worth saying:** happy-dom has no layout, so it doesn't replace a real browser for visual
  checks.

### 3.3 "Had trouble with tw and deno bundling"

- **Then:** twind (a Tailwind-in-JS library) wouldn't work with `deno bundle`, so the client moved
  to static styles in components (`03ba9a2`).
- **Actually (verified):** the dependency was `npm:twind@^1.0.0`. On npm, `twind`'s `latest` tag is
  still `0.16.19`, and 1.x was only ever published as `next`/`canary` prereleases, last modified in
  May 2023. The library was abandoned, so this is weak evidence against Deno.
- **To check:** the actual error, if you remember it.
- **Maybe:** a line on Tailwind today. The standalone CLI can generate a stylesheet, but utility
  classes and shadow DOM don't mix well, which ties into 3.5.

### 3.4 "Pulling in picocss via a TypeScript file… deno bundle doesn't do remote imports"

- **Then:** Pico lives as an 83 KB string in `client/src/pico-styles.ts`, and the Pico colors and
  Toastify CSS files were copied into `client/public`.
- **Now (verified on Deno 2.9.7):**
  - `import pico from '@picocss/pico/css/pico.min.css' with { type: 'text' }` works in `deno run`,
    `deno check`, and `deno bundle`, with no unstable flag.
  - A side-effect `import 'toastify-js/src/toastify.css'` in the bundle writes a `.css` file next to
    `bundle.js`.
  - `https:` imports bundle fine.
  - `deno bundle` also has `--watch` and `--minify` (the current build isn't minified: 192 KB, or
    159 KB minified, 34 KB gzipped).
- **To check:** the Deno version where text imports and the new `deno bundle` landed, to date the
  "then" properly (the client started 2025-07-05).

### 3.5 Shadow DOM and a CSS framework

- **Then:** to style components with Pico, every component extends `StyledComponent`, which adopts
  all of Pico into its shadow root.
- **What I had half right:** the common advice has shifted toward less shadow DOM for app
  components. But Lit's shadow roots are already "open"; open versus closed only controls
  JavaScript access, not whether page styles get in.
- **What actually helps:**
  - rendering top-level views into light DOM (`createRenderRoot() { return this; }`), so one
    page-level stylesheet applies
  - or building one shared stylesheet object and adopting it everywhere
- **Nice detail:** CSS custom properties _do_ inherit through shadow roots, which is why the
  page-level `pico.colors.min.css` (all `--pico-color-*` variables) already works in every component.
- **To update after Phase 5:** which way you went, and how light/dark mode turned out.

### 3.6 Tests and Deno KV

- **Then:** two route tests ignored "because test games are throwing them off".
- **Actually (verified):** without `KV_PATH`, `Deno.openKv()` opens one shared default database for
  the project, so test games pile up across runs.
- **Fix:** `KV_PATH=:memory:` in the test task. Both ignored tests pass that way.
- **Gotcha:** `dataLayer.ts` opens KV at import time, so the variable has to come from the task or
  command line; a `Deno.env.set` inside the test file runs too late.
- **Still true:** KV needs the unstable flag (`"unstable": ["kv"]`) in Deno 2.9.

### 3.7 Deno Deploy moved under me

- **Then:** a round of trial and error getting KV working on Deploy (three commits on 2026-01-01:
  `e77887d`, `9cdd6f6`, `f01f409`) and a `deploy` block in `deno.json` in the old deployctl format.
- **Now (verified):**
  - Deploy Classic shut down on 2026-07-20. The app runs on the new Deno Deploy at `.deno.net`; the
    `.deno.dev` host still named in the CORS config no longer resolves.
  - New Deploy reads a `deploy` block in `deno.json` (since 2026-01-27), with different keys, and
    it overrides the dashboard settings.
  - It gives each timeline (production, preview, branch) its own KV database.
  - It has `Deno.cron`, which is handy for deleting stale games.
  - KV queues aren't supported on new Deploy.
- **To check:** did the app migrate from Classic, or start on new Deploy? If it migrated, did the
  KV data need moving (the docs say it isn't migrated automatically)?

### 3.8 The dev loop (self-inflicted)

- The live-reload script is commented out, and the root `dev` task builds the client once while
  only the service is watched.
- Not a Deno limit: `deno bundle --watch` next to `deno run --watch` covers it.
- **To update after Phase 6:** what the dev loop ended up being.

## 4. If you're starting today

A checklist that saves readers the year:

- Standard decorators with `accessor` for Lit; don't enable `experimentalDecorators`
- happy-dom with the 3-line event-method fix for component tests
- `KV_PATH=:memory:` for tests
- Import CSS as text from npm; bundle with `--minify`
- Put the Deploy config in `deno.json`'s `deploy` block from the start
- Consider light DOM for app-level views if you use a CSS framework

## 5. Would I do it again?

- **Yes:** one toolchain, shared engine code, fast tests, and cheap hosting with a built-in
  database.
- **Real limits:**
  - no `useDefineForClassFields` switch
  - KV still behind an unstable flag
  - no hot module reload out of the box (Vite with the Deno plugin exists if you want it)
  - KV lacks queries, fine for lookup-by-id data but not for reporting
- **When I'd pick something else:** a client heavy on shared state and animation (Preact or React
  with Vite), or data that needs real queries (Postgres, which Deploy can also provision).

## Material to gather

- Screenshots: dashboard, game board mid-merger, game over
- Snippets: `dom.ts`, the reactivity repro, the `accessor` fix, `dataLayer.ts`, a Hono
  `app.fetch` test, the new `deploy` block once it exists
- Timeline: first commit 2023-04-15; moved to Deno 2025-04-14 (`ff500c7`); client started
  2025-07-05; on Deploy with KV 2026-01-01; complete games in production by 2026-09
- Numbers to refresh at writing time: test counts and times, bundle size, lines per package

## Original notes (from TODO.md, verbatim)

- the workspace thing lets me inherit fmt and stuff, which is awesome
- had trouble with tw and deno bundling. What?
- some decorators don't work with deno bundling-- `@state` in particular. How did I test/verify
  that? Also `@property` requires manual updating
- DOM testing was a total fail from `deno-dom` to `happy-dom` to `puppeteer` and even
  `@open-wc/web-test-runner`. Lit just isn't compatible running through deno. Stand along node
  testing would be required
  - update: happy-dom 20 does work with Lit under `deno test`, with one workaround (keep Deno's
    global event methods, see `client/src/components/__test__/dom.ts`)
- pulling in picocss via typescript file is a bit weird, but it works. Also had to add the css files
  for pico and toastify to the repo because deno bundle doesn't do remote imports
