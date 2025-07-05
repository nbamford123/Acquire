# Acquire Board Game

Digital implementation of the classic Acquire board game, built entirely with Deno

## Why This Project?
Exploring Deno's "code and go" philosophy - minimal configuration, built-in TypeScript, and serverless deployment. 

## Architecture
### Engine
- **Pattern**: Action/Reducer for predictable state management
- **State Management**: Immutable game states with pure functions

### REST API Service
- **Framework**: Oak (Deno's Express equivalent)
- **Authentication**: Simple JWT and whitelisted email addresses
- **Persistence**: Deno KV for game state storage
- **Deployment**: Deno Deploy (serverless)

### Frontend
- **Framework**: Lit web components
- **Architecture**: SPA connecting to REST API

## Local Development
```bash
deno task dev
```
