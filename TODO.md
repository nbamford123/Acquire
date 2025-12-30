# TO DO

## Client general

- check pr validation
- Put the unicode characters for hotels on the tiles when they are founded?
- we need to enforce types on the api calls
- the specific pico azure background (and azure colors in general) aren't light/darkmode sensitive
- update to [ky](https://github.com/sindresorhus/ky), cleaner syntax, retries, good interface for polling

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

Additional Considerations for HTTP Transmission

- Separate error channels:

Consider separating transport/HTTP errors from game logic errors
You might want game errors in the state and HTTP errors handled separately

- Status codes:

Use appropriate HTTP status codes for transport-level issues
Put game logic errors in the payload with a successful 200 status

- Security:

Be cautious about what details you include in errors (no stack traces to clients)
Sanitize error messages that might contain sensitive information

- Size optimization:

If you're sending frequent updates, consider a diff-based approach rather than full state
You might want to omit errors from certain state updates if they haven't changed

### Multiplayer & Turn-Based Considerations

For a multiplayer turn-based game, there are a few additional considerations:

1. **Error scoping**: Consider whether errors are player-specific or game-wide. You might want:

```typescript
type GameState = {
  // Game state
  currentError: GameError | null; // Current gameplay error
  playerErrors: Record<PlayerId, GameError | null>; // Player-specific errors
};
```

2. **Network/sync errors vs. game logic errors**: Distinguish between errors in gameplay rules and network/synchronization issues:

```typescript
type GameState = {
  // Game state
  gameplayError: GameError | null; // Errors in game rules
  syncError: NetworkError | null; // Errors in game synchronization
};
```

3. **Turn transition handling**: When a player ends their turn, you might want to explicitly clear certain types of errors:

```typescript
function endTurnReducer(state: GameState, action: EndTurnAction): GameState {
  // Normal turn transition logic...

  return {
    ...newState,
    gameplayError: null, // Clear gameplay errors on turn transition
    // But maybe keep sync errors until resolved
  };
}
```

4. **Error persistence for state debugging**: Since you're storing state by turn, consider adding a separate errors log that persists across turns for debugging:

```typescript
type GameState = {
  // Game state
  currentError: GameError | null; // Current active error
  errorLog: Array<{
    turn: number;
    playerId: string;
    timestamp: number;
    error: GameError;
  }>; // Historical record of errors
};
```

### State Persistence Strategy

For your turn-based state storage, consider:

1. **Error exclusion in persistence**: When persisting state between turns, you might want to strip out transient errors:

```typescript
function persistGameState(state: GameState): PersistedGameState {
  const { currentError, ...restState } = state;
  return restState; // Don't persist the current error
}
```

2. **Replay safety**: Ensure your state can be replayed without errors affecting the replay:

```typescript
function replayTurn(persistedState: PersistedGameState): GameState {
  return {
    ...persistedState,
    currentError: null, // Ensure replays start without errors
  };
}
```

3. **Turn boundaries**: Define clear points where error states are guaranteed to be clean:

```typescript
function startTurnReducer(state: GameState, action: StartTurnAction): GameState {
  // Clear any lingering errors at the start of a turn
  return {
    ...state,
    currentPlayer: action.playerId,
    error: null,
  };
}
```

### UI Considerations

For your UI layer

1. **Error dismissal**: Still provide explicit error dismissal for players:

```typescript
<ErrorNotification
  error={gameState.error}
  onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })}
/>;
```

# Action-Reducer-UseCase Architecture

## A Composable Pattern for Complex State Management

### What Is This?

A layered architecture for managing complex state transitions in applications (like board games) that separates concerns into four distinct layers:

1. **Actions** - Events that describe what happened
2. **Domain** - Pure business logic functions
3. **Reducers** - Pure state transformation functions
4. **Use Cases** - Orchestration layer that coordinates domain logic and reducers

This is essentially **"Clean Architecture with Redux-style State Management"** - a hybrid combining:

- Redux (unidirectional data flow, reducers)
- Clean Architecture (use cases, domain layer)
- Domain-Driven Design (pure domain functions)

---

## The Four Layers Explained

### 1. Domain Layer (Pure Business Logic)

**Purpose:** Pure, deterministic business rules and calculations

**Characteristics:**

- Operate on domain entities (Player, Hotel, Card, etc.)
- No dependencies on GameState or orchestration concerns
- Reusable across different contexts (AI, simulation, validation)
- Completely pure - same inputs always produce same outputs

**Example:**

```typescript
// Check if a move is legal based on business rules
function canPurchaseShares(
  player: Player,
  shares: Record<string, number>,
  hotels: Hotel[],
): boolean;
```

---

### 2. Reducers (State Transformations)

**Purpose:** Pure functions that apply specific state changes

**Characteristics:**

- Take specific inputs, return state updates (GameState or Partial<GameState>)
- No orchestration or business flow logic
- Can be called by multiple use cases (reusable building blocks)
- Can call domain functions for validation/calculation

**Example:**

```typescript
// Apply a share purchase to state
function buySharesReducer(
  state: GameState,
  shares: Record<string, number>,
  playerId: number,
  cost: number,
): Partial<GameState>;
```

---

### 3. Use Cases (Entry Points)

**Purpose:** Validate that an action is allowed RIGHT NOW, then delegate

**Characteristics:**

- Entry point for all actions
- Handle orchestration validation (phase/turn/permission checks)
- Delegate to ONE of: orchestrator, reducer, or inline update
- Should be concise (~10-15 lines max)

**What Use Cases SHOULD Have:**

- ✅ Phase/turn/permission checks (orchestration validation)
- ✅ Business rule validation calls (delegate to domain)
- ✅ ONE delegation (to orchestrator, reducer, or inline)

**What Use Cases Should NOT Have:**

- ❌ Multiple orchestration decisions ("if this then that flow")
- ❌ Complex state transformations
- ❌ Calling multiple reducers/orchestrators

**Example:**

```typescript
function buySharesUseCase(
  state: GameState,
  action: BuySharesAction,
): GameState {
  // 1. Orchestration validation (phase/turn)
  if (state.phase !== 'BUY_SHARES') return state;

  // 2. Extract data from state
  const player = state.players[state.currentPlayer];

  // 3. Domain validation
  if (!canPurchaseShares(player, action.shares, state.hotels)) {
    return state;
  }

  // 4. Delegate to orchestrator for complex flow
  return buySharesOrchestrator(state, action.shares);
}
```

---

### 4. Orchestrators (Multi-Step Flows)

**Purpose:** Manage complex, multi-step state transitions

**Characteristics:**

- Handle flows with multiple decision points
- Call reducers for state transformations
- Can call other orchestrators for composition
- Make flow decisions based on state

**Example:**

```typescript
function buySharesOrchestrator(
  state: GameState,
  shares: Record<string, number>,
): GameState {
  // 1. Calculate cost
  const cost = calculateShareCost(shares, state.hotels);

  // 2. Apply purchase via reducer
  let newState = buySharesReducer(state, shares, state.currentPlayer, cost);

  // 3. Check for game-ending condition
  if (allHotelsMaxed(newState.hotels)) {
    newState = endGameOrchestrator(newState);
  }

  // 4. Advance to next player
  return advancePlayerOrchestrator(newState);
}
```

---

## Data Flow

```
Action
  ↓
Action Dispatcher (routing)
  ↓
Use Case (entry point)
  ├─ Orchestration validation (phase/turn checks)
  ├─ Business validation (domain functions)
  └─ Delegate to ONE of:
      │
      ├─ Inline update (trivial changes)
      ├─ Reducer (state transformation)
      └─ Orchestrator (complex flow)
          ├─ Calls reducers
          ├─ Calls domain functions
          └─ Calls other orchestrators
  ↓
New State
```

---

## Key Principles

### The Mental Model

**Use Cases can call:**

- ✓ Domain functions (validation, calculations)
- ✓ Reducers (state transformations)
- ✓ Orchestrators (complex flows)

**Orchestrators can call:**

- ✓ Domain functions (validation, calculations)
- ✓ Reducers (state transformations)
- ✓ Other orchestrators (composition)

**Reducers can call:**

- ✓ Domain functions (validation, calculations)
- ✗ NOT use cases or orchestrators

**Domain functions can call:**

- ✓ Other domain functions
- ✗ Nothing else

### Core Rules

1. **All actions go through use cases** - Use cases are always the entry point
2. **Use cases validate and delegate** - Orchestration checks + business validation, then ONE delegation
3. **Orchestrators manage multi-step flows** - Can call reducers and other orchestrators
4. **Reducers transform state** - Pure state updates, can call domain functions
5. **Domain functions are pure** - No GameState, no side effects
6. **Validation splits by concern:**
   - Orchestration checks (phase/turn/permission) → Use case
   - Business rules (game logic) → Domain functions

---

## When to Use What

| Component            | Use When                                        | Example                                    |
| -------------------- | ----------------------------------------------- | ------------------------------------------ |
| Domain Function      | Pure business logic, reusable calculations      | `canPurchaseShares()`, `calculateCost()`   |
| Reducer              | State transformation needed by multiple actions | `buySharesReducer()`, `addPlayerReducer()` |
| Orchestrator         | Multi-step flow with decision points            | `resolveMergerOrchestrator()`              |
| Inline (in Use Case) | Trivial single-property update                  | `return { ...state, flag: true }`          |

---

## Example Flows

### Simple Action (Direct to Reducer)

```typescript
[ActionTypes.ADD_PLAYER]: addPlayerUseCase
  → validates phase
  → calls addPlayerReducer()
  → returns new state
```

### Complex Action (Uses Orchestrator)

```typescript
[ActionTypes.BUY_SHARES]: buySharesUseCase
  → validates phase/turn
  → calls canPurchaseShares() [domain]
  → calls buySharesOrchestrator() [orchestrator]
      → calls buySharesReducer() [reducer]
      → calls advancePlayerOrchestrator() [orchestrator]
  → returns new state
```

### Shared Reducer (Reusable Building Block)

```typescript
resolveMergerReducer()
  ← called by breakMergerTieOrchestrator
  ← called by playTileOrchestrator
  ← called by other orchestrators...
```

---

## Benefits

✅ **Testability** - Each layer can be tested in isolation\
✅ **Reusability** - Domain functions and reducers are composable building blocks\
✅ **Clarity** - Clear separation of "what's legal" (domain) vs "when it's legal" (use case)\
✅ **Flexibility** - Easy to compose complex flows from simple pieces\
✅ **Type Safety** - TypeScript enforces contracts between layers\
✅ **Maintainability** - Each component has a single, clear responsibility

---

## Comparison to Redux

| Aspect       | Redux                     | This Pattern                           |
| ------------ | ------------------------- | -------------------------------------- |
| Reducers     | Top-level action handlers | Composable building blocks             |
| Middleware   | Handles side effects      | Use cases + orchestrators handle flows |
| Selectors    | Read state                | Domain functions operate on entities   |
| Thunks/Sagas | Async orchestration       | Orchestrators handle sync flows        |

---

## The "Use Case Litmus Test"

**If your use case is longer than ~15 lines, ask:**

- "Am I making flow decisions?" → Extract to orchestrator
- "Am I transforming state?" → Extract to reducer
- "Am I doing complex calculations?" → Extract to domain function

**A good use case structure:**

- ~5-10 lines of validation
- 1 line of delegation
- **Total: ~10-15 lines max**

---

## Summary

| Layer        | Input              | Output                          | Purpose                 |
| ------------ | ------------------ | ------------------------------- | ----------------------- |
| Use Case     | GameState + Action | GameState                       | Validate & delegate     |
| Orchestrator | GameState + params | GameState                       | Manage multi-step flows |
| Reducer      | Flexible           | GameState or Partial<GameState> | Transform state         |
| Domain       | Specific types     | Specific types                  | Pure business logic     |

---

This architecture emerged from evolving a Redux-style implementation to handle the complexity of asynchronous board game state management, where simple action→reducer patterns weren't sufficient for multi-step game flows, mergers, and complex turn transitions.
