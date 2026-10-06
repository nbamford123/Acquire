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

This serves the app on http://localhost:8000 with the service's settings from `service/.env`. It
rebuilds the client bundle and restarts the service as their code changes, and open pages reload
after either. Changes to `client/public` need a restart.

Run `deno task hooks` once per clone to check formatting, lint, types, and tests before each commit
(the same `deno task check` CI runs). `deno task validate` does the same but fixes formatting instead
of failing on it.
