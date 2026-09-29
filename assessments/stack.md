# Stack assessment: full-stack Deno with a Lit client

Written 2026-09-29 against `main` at `c780668`, with Deno 2.9.7, Lit 3.3.1 (locked), and happy-dom
20.14.5.

## Bottom line

Keep the stack. The evidence in the repo doesn't show that Deno or Lit is the wrong choice. It shows
three things:

1. **The worst client problem came from one config setting, not from `deno bundle` or Lit.** Deno
   ignores `useDefineForClassFields`, so TypeScript class fields always use define semantics. Those
   fields shadow Lit's reactive accessors. The same thing happens with decorators and with
   `static properties` when the field has an initializer or a plain declaration. It happens under
   `deno run`, `deno test`, and `deno bundle`. The fix is small: standard decorators with the
   `accessor` keyword, with no `experimentalDecorators`. I checked that it works in Deno and in the
   bundle. The workaround in `PLAN.md` ("replace the remaining decorators with `static properties`")
   does **not** fix it on its own.
2. **Most of the pain in the "Eventual blog post" section has gone away.** Component tests run under
   `deno test`. `deno bundle` handles remote imports, CSS from npm, `--watch`, and `--minify`. New
   Deno Deploy runs the app, has KV, reads config from `deno.json`, and has cron.
3. **What's left is repo hygiene, not the platform:** stale config, a dev loop that was never
   finished, and tests pointed at a shared local KV file. Each of these is a small job.

The shadowing issue also causes a **live bug** that I reproduced: after you delete a game on the
dashboard, the dashboard shows the wrong cards. Details are under Lit, below.

## How to read this

- **Verified** means I read it in the repo, ran it, or reproduced it in a scratch directory outside
  the repo. The commands and outcomes are in the appendix.
- **Judgment** means my opinion, based on the verified facts.
- I didn't modify any existing files. The experiments ran with `--no-lock`, and `git status` stayed
  clean.

## The blog-post claims, revisited

These are the claims from the "Eventual blog post" section of `TODO.md`, checked against the current
tools.

| Claim in TODO.md                                                                                            | Status now                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace inheritance of fmt/lint is great                                                                  | **Still true.** The root `deno.json` holds the only fmt and lint config. The member files are 3–20 lines.                                                                                                                                                                                                                                                                                                                                               |
| Trouble with Tailwind (twind) and deno bundling                                                             | **Not clearly a Deno problem.** The dependency was `npm:twind@^1.0.0`. On npm, `twind`'s `latest` tag is still `0.16.19`, and the 1.x line was published only as `next`/`canary`, last modified 2023-05. The library was abandoned. I couldn't reproduce the original failure because the code is gone (`03ba9a2`).                                                                                                                                     |
| Some decorators don't work with deno bundling, `@state` in particular; `@property` needs manual updating    | **The symptom is real, but the cause is misattributed.** It isn't bundling. Deno ignores `useDefineForClassFields` (it prints "The following options were ignored: useDefineForClassFields"), so decorated fields with initializers shadow Lit's accessors under `deno run` and `deno test` too. `static properties` plus a class field breaks the same way. Standard decorators with `accessor` work everywhere, including the bundle. See Lit, below. |
| DOM testing was a total fail; Lit isn't compatible with Deno                                                | **Obsolete.** 25 client tests (59 steps) pass in about 0.5 s under `deno test` with happy-dom. The only workaround is the 3-line one in `client/src/components/__test__/dom.ts`.                                                                                                                                                                                                                                                                        |
| Pico is pulled in through a TS file; CSS files were copied in because deno bundle doesn't do remote imports | **Obsolete.** `deno bundle` bundled an `https://esm.sh/lit` import. `import pico from '@picocss/pico/css/pico.min.css' with { type: 'text' }` works in `deno run`, `deno check`, and `deno bundle` with no unstable flag. A side-effect `import 'toastify-js/src/toastify.css'` writes a sibling `.css` file next to the bundle.                                                                                                                        |

These make a better blog post than the original list. "Here's what I blamed on Deno, and what it
actually was" is more useful to readers than a list of complaints that no longer hold.

## Runtime and tooling

**Verified**

- One toolchain covers everything: `deno task check` runs fmt, lint, check, and test, and it's the
  same command in CI (`.github/workflows/deno.yml`) and in the pre-commit hook. On this machine the
  test suites are fast: engine 194 tests in 0.9 s, service 15 in 0.2 s, client 25 in 0.5 s.
- Every `deno check` prints "experimentalDecorators compiler option is deprecated". Also,
  `client/deno.json` sets `emitDecoratorMetadata: true`, but nothing uses decorator metadata (there's
  no `reflect-metadata`).
- Deno doesn't honor `useDefineForClassFields: false`. It reports the option as ignored. This is the
  one real constraint Deno puts on this codebase.
- There's some leftover drift:
  - `client/deno.lock` and `service/deno.lock` were last touched on 2025-09-20, the commit that
    adopted the workspace. A workspace uses only the root lock, so these are stale.
  - `hono` is declared in the root (`^4.13.9`) and again in `service/deno.json` (`^4.0.0`).
    `@std/testing` is declared in both `client` and `service` with different specifiers.
  - `client/deno.json` has `preview` and `deploy` tasks that point at `dist/server.ts` and
    `deploy.ts`. Neither file exists.
  - The root `dev` task passes `--unstable-kv`, and `deno.json` also has `"unstable": ["kv"]`.
- KV still needs the unstable flag in 2.9.7. Without it, `Deno.openKv` is not a function.

**Friction: low.** Everything above is config debt you can clean up in an afternoon. None of it
blocks feature work.

**Alternatives**

- Node with pnpm, Vite, Vitest, and ESLint/Prettier: about a day to set up. It replaces one tool with
  four configs and gives up the "no package.json" premise of the project.
- Bun: similar story. It has no KV and no Deploy.

**Judgment:** Staying on Deno is the easy call. The single-toolchain setup is the main thing that
makes this repo cheap to maintain alone, and it's the premise of the blog post.

## Lit

**Verified: how components declare reactive properties today**

| Component                                       | Declaration                                                                                 | Reactive as written?                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `ActionCard`                                    | `static properties` + `declare` + set in constructor                                        | Yes, and it has a comment explaining why |
| `GameBoardView`                                 | `@property` fields `gameId`, `user`; static `loading = false`, `pendingAction?:`            | No, all four are shadowed                |
| `DashboardView`                                 | `@property` fields `user`, `showConfirmationDialog`; static `games = []`, `loading = false` | No                                       |
| `GameCard` (the class is named `DashboardView`) | `@property user = null`; `game` isn't declared reactive at all                              | No                                       |
| `LoginView`                                     | static `loading = false`                                                                    | No                                       |
| `AppShell`                                      | static `appState = {...}`, `dialogConfig?:`                                                 | No                                       |

The code makes up for this with 10 manual `requestUpdate()` calls (AppShell 4, GameBoardView 5,
DashboardView 1), and with the fact that parents usually set properties before a child's first
render.

I reproduced the behavior in isolation, with the client's `compilerOptions`:

| Pattern                                                                                                   | `deno run` / `deno test`   | `deno bundle` output |
| --------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------- |
| `@property() name = 'a'` / `@state() count = 0` (experimental decorators)                                 | not reactive               | not reactive         |
| `static properties` + `count = 0`                                                                         | not reactive               | not reactive         |
| `static properties` + `private count?: number` (no initializer)                                           | not reactive               | not reactive         |
| `static properties` + `declare count` + constructor assignment                                            | reactive                   | reactive             |
| Adding `useDefineForClassFields: false`                                                                   | ignored by Deno, no change | not tested           |
| Standard decorators (no `experimentalDecorators`): `@property() accessor name`, `@state() accessor count` | reactive                   | reactive             |

Because git history (`96a3477`, `3e5418b`) shows `@state()` being replaced with
`static properties` while the field initializers stayed, the move to static properties didn't fix
anything. The manual `requestUpdate()` calls are what made it work.

**Verified: a live bug from this.** I mounted the real `DashboardView` under happy-dom with a stubbed
API holding games A, B, and C, then deleted A. The data became `[B, C]`, but the dashboard still
showed `[A, B]`. Lit reuses the `<game-card>` elements by position. `GameCard.game` is a plain
field, so assigning new data to it never re-renders the card. I didn't click through this in
production, but lit-html sets `.game` the same way in a browser.

**Verified: styling**

- `StyledComponent` puts all of Pico (the 83 KB string in `client/src/pico-styles.ts`) into every
  component's shadow root with `unsafeCSS`. It's inside a `static get styles()`, so each component
  class builds its own copy of the stylesheet.
- The document-level `pico.colors.min.css` works across shadow roots because it only defines custom
  properties (`--pico-color-*`), and those inherit through shadow DOM. `AppShell` and `GameCard`
  already depend on this.
- Lit shadow roots are already `mode: 'open'` by default. Open versus closed only affects JavaScript
  access to the root, not whether outside styles apply.

**Friction: high historically, low from here.** The reactivity issue probably caused most of the
"Lit + Deno is weird" feeling. The fix is mechanical.

**Alternatives**

- **Standard decorators with `accessor`.** Recommended; S–M effort. Remove `experimentalDecorators`
  and `emitDecoratorMetadata`. Change every reactive field to `@property() accessor x = ...` or
  `@state() accessor x = ...`. Delete the manual `requestUpdate()` calls. Make `GameCard.game` a
  `@property({ attribute: false }) accessor`. This also clears the deprecation warning. The cost:
  the bundle grows because esbuild lowers the decorators (my test component went from 25.6 KB to
  36.6 KB unminified, and most of that is fixed helper code), and `accessor` is less familiar
  syntax. The existing tests should keep passing, and you'd add one test for the delete case above.
- **`static properties` + `declare` + constructor assignment** everywhere, like `ActionCard`. This
  also works and needs no decorators, but it's noisier: every property is declared three times.
- **Light DOM for app-level components.** This is what the recent "use less shadow DOM" advice
  actually offers here. It's M effort. `createRenderRoot() { return this; }` lets a single
  document-level Pico stylesheet apply, and removes `StyledComponent`, `pico-styles.ts`, and the
  per-component copies. The costs:
  - no `<slot>` (unused today)
  - component styles need prefixed selectors and have to move out of `static styles`
  - the four test files that use `shadowRoot` change to querying the element directly

  A cheaper middle step is to keep shadow DOM and build the Pico `CSSResult` once at module scope
  from the npm text import.
- **Preact or React with Vite.** You'd rewrite about 2,700 lines of component and style code and
  about 1,400 lines of client tests: roughly one to two weeks. It fixes nothing that the rows above
  don't.

**Judgment:** Lit is a fine fit for this app's size and for the Deno story. The problems were one
misunderstood language rule plus shared styling. For look-and-feel work (Phase 5), light DOM for
views like dashboard, board, and login would make Pico and theming (the light/dark item) much
simpler. Keeping shadow DOM for small reusable pieces is optional.

## Bundling, CSS, and the dev loop

**Verified**

- `client/scripts/build.ts` copies `public/` and runs `deno bundle` without `--minify`. The bundle
  is 192 KB, or 159 KB minified (34 KB gzipped). About 83 KB of that is the Pico string.
- `deno bundle` now supports `--watch` and `--minify`. It handles `https:` imports, npm CSS as text
  (`with { type: 'text' }`, no flag needed), and side-effect CSS imports, which produce a `.css`
  file next to the bundle.
- The dev loop is half built:
  - The live-reload `EventSource` script is commented out in `client/public/index.html`.
  - The root `dev` task builds the client once, and then only the service is watched.
  - `client/dev-server.ts` is a second server on port 8080 that proxies to 8000. It only reacts to
    `modify` events, and editors that save atomically often emit create or rename events instead.
  - This fits the TODO note that hot reload doesn't seem to work.

**Friction: medium in the past, low now.** The copied CSS files and the TS string are no longer
necessary.

**Alternatives**

- **Stay on `deno bundle`.** S effort:
  - Import Pico from `npm:@picocss/pico` instead of `pico-styles.ts`.
  - Import Toastify's CSS from the package.
  - Add `--minify`.
  - Replace `dev-server.ts` with `deno bundle --watch` running next to the service's `--watch`, plus
    a small reload endpoint if you want the browser to refresh by itself.
- **Vite with the official Deno plugin.** M effort: half a day to a day, not verified here. This
  gets you HMR, CSS handling, and Tailwind v4 if you still want it. The costs are a Vite config,
  mapping the workspace's `@acquire/engine/*` imports, and probably a `node_modules` directory.

**Judgment:** Stay on `deno bundle` unless you specifically want HMR or Tailwind. The build is 30
lines and there's nothing left for Vite to fix.

## Deno KV

**Verified**

- `service/dataLayer.ts` opens KV once, at import time: `Deno.openKv(Deno.env.get('KV_PATH'))`.
  - On Deploy, `KV_PATH` is unset, so it uses the provisioned database.
  - Locally, `.env` sets `KV_PATH="./.data/acquire.kv"`.
  - In tests, `deno task check` sets no `KV_PATH`, so tests write to Deno's shared default database
    for the project. That's why two route tests are ignored.
- Setting `KV_PATH=:memory:` fixes the tests. The whole service suite passes with it. With the two
  ignored tests un-ignored (in a scratch copy), all 17 tests pass alongside `fullGame.test.ts`.
  Because KV opens at import time, the variable has to come from the task or the command line, not
  from a `Deno.env.set` inside a test file.
- Data model:
  - `['games', id]` holds the state, about 8 KB per game in the test data. The KV limit is 64 KiB
    per value.
  - `['actions', id, n]` holds one entry per logged action. `fed5a26` split these out so long games
    stay under the value limit.
- In the move endpoint (`service/routes.ts`, the `POST /api/games/:id` handler):
  - The state is read, processed, and written back with no versionstamp check.
  - The state and the new actions are written in two separate operations, so they aren't atomic.
  - The whole action log is read just to count it.
  - `deleteGame` deletes keys one at a time.
- No queues or `enqueue` are used anywhere. That matters because new Deploy doesn't support KV
  queues.

**Friction: low.** The one real problem, test isolation, is a one-line task change.

**What KV already offers for the plan**

- A consistent move: `kv.atomic().check({ key, versionstamp }).set(state).set(action…).commit()`
  handles concurrent submits and writes the state and the log together.
- Phase 1 inactivity culling: `Deno.cron` on new Deploy (available since 2026-03) can sweep games
  older than a cutoff based on `lastUpdated`. `expireIn` is simpler for the game key, but the
  action entries don't get rewritten on each move, so they would expire on their own schedule.
- Phase 4 leaderboard: a per-player key, updated in the same atomic commit as game over.

**Alternatives**

- **Postgres.** New Deploy can provision one (Prisma-hosted, isolated per timeline). M–L effort,
  1–2 days: a schema, a driver, migrations, and a local Postgres for development and tests. It buys
  ad-hoc queries you don't need yet.
- **SQLite or Turso.** Similar cost.
- **Lock-in:** Deno documents using KV from Node through `@deno/kv`, and `denokv` can be
  self-hosted, so leaving Deploy later wouldn't force a database change.

**Judgment:** KV fits this app. Everything is looked up by game ID, and the leaderboard is a
per-player value. I'd reconsider only for features that need real queries, like per-player history,
search, or stats across games.

## Deno Deploy

**Verified**

- Production answers at `https://acquire.nbamford123.deno.net`, with `server: deployd` in the
  response headers. The `.deno.dev` hostname in `service/main.ts`'s CORS allowlist doesn't resolve.
  - That CORS setup is also registered _after_ `setRoutes`. I checked with `app.fetch`: preflight
    `OPTIONS` requests get CORS headers, but actual `POST /api/login` and `GET /health` responses
    don't.
  - The client is served from the same origin, so nothing depends on CORS. It's dead configuration.
- Deploy Classic shut down on 2026-07-20, so the app is on new Deploy. (Source: Deno docs and
  changelog; see Sources.)
- New Deploy has changed in ways that matter here:
  - Since 2026-01-27 it reads a `deploy` section from `deno.json`, and that section **takes priority
    over dashboard settings**. The supported keys are `framework`, `install`, `build`, `predeploy`,
    and `runtime` (`entrypoint`, `cwd`, …).
  - The repo's `deploy` block uses the old deployctl keys (`project`, `entrypoint`, `include`,
    `exclude`). Its `include` doesn't even list `client/`, yet the client ships, so it's evidently
    not being used as-is.
  - Other changes: KV isolated per timeline (preview and branch deploys get their own database),
    `Deno.cron`, and `deno task --tunnel`.
- Nothing in the repo builds `client/dist` for Deploy, and `serveStatic({ root: '../client/dist' })`
  depends on the working directory. So the build command and working directory must live only in
  the dashboard. The three KV setup commits on 2026-01-01 (`e77887d`, `9cdd6f6`, `f01f409`) show a
  short round of trial and error.

**Friction: low, but the config is partly invisible.** The deploy setup can't be reviewed from the
repo.

**Alternatives**

- A container host (Fly, Render, Railway) running `deno`: M effort for a Dockerfile, plus moving KV
  to self-hosted `denokv` or another database.
- Cloudflare Workers: M–L effort, and it has no Deno KV.

Both cost more and give you nothing this app needs.

**Judgment:** Stay. Instead of simply deleting the `deploy` block as `PLAN.md` Phase 1 says,
**replace** it with the new schema: `install`/`build: "deno task build"` and
`runtime: { entrypoint, cwd }`. That way the deploy lives in the repo and changes go through PR
review. Because source config overrides the dashboard, test this on a preview timeline first.

## Recommendation

For your goals (easy maintenance, testing, learning, the blog post, and more features), **keep Deno,
Lit, `deno bundle`, KV, and Deploy**, and change how you use them. In order:

1. **Fix Lit reactivity** with standard decorators and `accessor`, and drop
   `experimentalDecorators`/`emitDecoratorMetadata`. This replaces the Phase 6 decorator item, whose
   planned fix wouldn't work. Delete the manual `requestUpdate()` calls, and add a dashboard test
   that deletes a game. This fixes a user-visible bug, so it belongs in Phase 1 or 2, not Phase 6.
2. **Point the tests at `KV_PATH=:memory:`** in `check` and `validate`, and un-ignore the two route
   tests. I verified they pass.
3. **Replace, don't just delete, the `deploy` block**, and remove the dead CORS setup at the same
   time.
4. **Make the moves consistent:** one atomic commit with a versionstamp check for the state plus its
   actions.
5. **Clean up the CSS:** import Pico and Toastify from npm, minify the bundle, and before Phase 5
   decide on light DOM for the top-level views. Fix the dev loop with `deno bundle --watch`.
6. **Housekeeping:** delete the member lockfiles, the duplicate `hono`/`@std/testing` entries, and
   the dead `preview`/`deploy` client tasks.

I'd put items 1–3 in one PR (S–M), then the rest as they come up. None of this needs a new
framework.

**What would change the recommendation**

- **Deno drops `experimentalDecorators` before you migrate.** That doesn't change the direction,
  just the urgency: the `accessor` migration becomes required.
- **You want a rich client:** drag and drop, animations, lots of shared client state, or a
  component library ecosystem. Then Preact or React with Vite is worth the one-to-two-week rewrite.
  Nothing in `PLAN.md` needs that.
- **You need real queries** (per-player history, stats across games, admin reports). Then move to
  Postgres on Deploy. The leaderboard as planned does not need it.
- **Deploy pricing or limits change, or you need regions beyond US/EU.** Then a container host
  running `deno` with self-hosted `denokv` is the escape hatch, and it keeps the code the same.
- **You want Tailwind or HMR specifically.** Then Vite with the Deno plugin is the incremental step.
  That's a bundler swap, not a stack change.

## Appendix: experiments

The scratch files were outside the repo, so this lists what each experiment ran and what it showed.

- **Reactivity.** Three tiny `LitElement`s (decorators, static plus field, static plus `declare`)
  under happy-dom, with the client's `compilerOptions`. Each mounted, set `count = 5`, awaited
  `updateComplete`, and compared the rendered text.
  - Results were the same under `deno run` and after `deno bundle`, as in the Lit table above.
  - A variant with `useDefineForClassFields: false` printed "The following options were ignored:
    useDefineForClassFields".
  - A variant with no `experimentalDecorators` and `@property() accessor` / `@state() accessor` was
    reactive both ways.
- **Dashboard delete.** Imported `client/src/components/DashboardView.ts` under happy-dom with
  `fetch` stubbed to serve games A, B, and C, then dispatched `game-delete` for A. The rendered
  `<h3>`s were `[A, B]` while the data was `[B, C]`.
- **CSS and remote imports.** `deno bundle` of an `import pico from '@picocss/pico/css/pico.min.css'
  with { type: 'text' }` module succeeded without flags, as did `deno run` and `deno check`. A
  side-effect CSS import produced `side.css`, and an `https://esm.sh/lit@3.3.0` import bundled.
- **Bundle size.** `deno bundle src/main.ts`: 191.98 KB. With `--minify`: 159.25 KB, 33,683 bytes
  gzipped.
- **KV.** `KV_PATH=:memory: deno test -A service/`: 15 passed, 2 ignored. A scratch copy of
  `routes.test.ts` with `.ignore` removed, run with the other service tests: 17 passed.
  `Deno.openKv` without the unstable flag is not a function in Deno 2.9.7.
- **CORS.** `app.fetch` against `service/main.ts`: `OPTIONS /api/login` returned 204 with
  `Access-Control-Allow-Origin`. `POST /api/login` and `GET /health` returned no such header.
- **Production host.** `https://acquire.nbamford123.deno.net/health` returned 200 with
  `server: deployd`. `acquire.nbamford123.deno.dev` didn't connect.
- **twind.** The npm registry shows `twind` `latest` at `0.16.19`, with 1.x only as `next` and
  `canary` tags, last modified 2023-05-21.

## Sources

- [Migrating from Deploy Classic to Deno Deploy](https://docs.deno.com/deploy/migration_guide/): KV
  data isn't migrated, queues aren't supported, per-timeline database isolation, the 2026-07-20
  shutdown
- [Deno Deploy changelog](https://docs.deno.com/deploy/changelog/): KV databases (2025-08-27),
  `deno.json` deploy config (2026-01-27), `--tunnel` (2025-11-25), `Deno.cron` (2026-03-12)
- [Deno Deploy build configuration](https://docs.deno.com/deploy/reference/builds/): the `deploy`
  keys, and source config taking precedence over the dashboard
- [Deploy Classic](https://docs.deno.com/deploy/classic/) and
  [KV on Deno Deploy](https://docs.deno.com/deploy/classic/kv_on_deploy/)
- [Using KV in Node.js](https://docs.deno.com/deploy/kv/node/)
- [Lit decorators](https://lit.dev/docs/components/decorators/): `useDefineForClassFields`, and
  `accessor` working with every configuration
- [Lit 3.0 release](https://lit.dev/blog/2023-10-10-lit-3.0/): support for standard decorators
