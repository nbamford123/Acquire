# Acquire Board Game

Digital implementation of the classic Acquire board game, built entirely with Deno

## Why This Project?

Exploring Deno's "code and go" philosophy - minimal configuration, built-in TypeScript, and serverless deployment. No node_modules or package.json.

## Architecture

### Engine

- **Pattern**: Action/Reducer for predictable state management
- **State Management**: Immutable game states with pure functions

### REST API Service

- **Framework**: [Hono](https://hono.dev/)
- **Authentication**: Simple JWT and whitelisted email addresses
- **Persistence**: Deno KV for game state storage
- **Deployment**: Deno Deploy (serverless)

### Frontend

- **Framework**: Lit web components bundled with deno bundle
- **Architecture**: SPA connecting to REST API with simple browser api router

## Local Development

```bash
deno task dev
```

Copy `service/.env.sample` to `service/.env` first. Then this serves the app on
http://localhost:8000, rebuilds the client bundle and restarts the service as their code changes,
and, with the sample's settings, reloads open pages after either and shows the last 100 API requests
with their bodies at http://localhost:8000/dev/requests. Changes to `client/public` need a restart.

Run `deno task hooks` once per clone to check formatting, lint, types, and tests before each commit
(the same `deno task check` CI runs). `deno task validate` does the same but fixes formatting instead
of failing on it.

## Settings

The service reads these environment variables, from `service/.env` locally and from the Deno Deploy
dashboard in production. Flags are on only when set to `true`.

On Deno Deploy, production and preview alike, the service also sees `DENO_DEPLOYMENT_ID`, which Deno
Deploy sets itself. It makes the login cookie HTTPS-only, and refuses `API_LOG` and a missing
`JWT_SECRET`.

| Variable          | Purpose                                                                                                         | Default                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `JWT_SECRET`      | Signs login tokens. Required on Deno Deploy, and different in the Development context                           | A fixed key, outside production |
| `ALLOWED_EMAILS`  | Who can log in: `name:email` pairs separated by commas. The name is the player's name in games                  | Nobody                          |
| `KV_PATH`         | Where Deno KV keeps games; tests use `:memory:`                                                                 | Deno's default location         |
| `PORT`            | The port to serve on                                                                                            | `8000`                          |
| `SEED_TEST_GAMES` | Flag: wipe KV and load the games in `service/__test-data__` on each start. Local only                           | Off                             |
| `DEV_RELOAD`      | Flag: reload open pages after a client rebuild or a service restart. Local only                                 | Off                             |
| `API_LOG`         | Flag: keep the last 100 API requests and responses at `/dev/requests`, and log changes and failures. Local only | Off                             |
