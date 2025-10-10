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
