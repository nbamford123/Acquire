# TO DO

## Client general

- we need to enforce types on the api calls
- the specific pico azure background (and azure colors in general) aren't light/darkmode sensitive
- update to [ky](https://github.com/sindresorhus/ky), cleaner syntax, retries, good interface for polling

## Dashboard

- make the time calculation work right, and add "updated" or "created".
- should the join/etc. buttons actually be styled links?
- create game states for 6/6 players, playing/other owner/etc
- join/delete/start game -confirmation dialog
- before game has started, players can leave, confimation dialog

## Game Board

- Have the pending action title featured as the header or something like that in the action card, e.g. "Found Hotel"
- should we put the current user in the user list, just so they know their place in the rotation?
- layout, board takes more available space
- give players unique colors?
- game state on page somewhere, at least until it's started

## Misc

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
- pass (have money but don't want to buy stocks)
- ttl/culling of old games

## Eventual blog post

- the workspace thing lets me inherit fmt and stuff, which is awesome
- had trouble with tw and deno bundling. What?
- some decorators don't work with deno bundling-- `@state` in particular. How did I test/verify that? Also `@property` requires manual updating
- DOM testing was a total fail from `deno-dom` to `happy-dom` to `puppeteer` and even `@open-wc/web-test-runner`. Lit just isn't compatible running through deno. Stand along node testing would be required
- pulling in picocss via typescript file is a bit weird, but it works. Also had to add the css files for pico and toastify to the repo because deno bundle doesn't do remote imports

## Actions

Need a new action state apart from the game state, it can be like

```typescript
interface gameAction {
  turn: number;
  actions: string[];
}
```

then the server can send game actions along with the state update, it will be everything that's happened since your last turn, which mean we will have
to filter and cull the actions

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
   typescript```
   function persistGameState(state: GameState): PersistedGameState {
   const { currentError, ...restState } = state;
   return restState; // Don't persist the current error
   }

````
2. **Replay safety**: Ensure your state can be replayed without errors affecting the replay:
```typescript
function replayTurn(persistedState: PersistedGameState): GameState {
  return {
    ...persistedState,
    currentError: null, // Ensure replays start without errors
  };
}
````

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

### High-level assessment

The conceptual split is reasonable: you appear to be using
domain/ for pure business/domain operations (hotel merging, share price calculation, tile ops),
reducers/ for mapping actions to state-change intents,
state/ for higher-level orchestration that manipulates GameState or coordinates multi-step transitions.
That separation is a good starting point: it isolates pure logic from stateful orchestration and from action-handling plumbing.
However, there are a few clarity and maintenance issues to address so the split remains robust as the project grows.

## The mental model

Usecases can call:
→ Domain functions (validation, calculations)
→ Reducers (state transformations)
→ Other usecases (shared orchestration)

Reducers can call:
→ Domain functions (validation, calculations)
→ Other domain functions
✗ NOT other usecases or reducers

## The Pattern Name

This is "Clean Architecture with Redux-style State Management" or more specifically:
Action-Reducer-UseCase Architecture (my shorthand)
It's a hybrid of:

- Redux (unidirectional data flow, reducers)
- Clean Architecture (use cases, domain layer)
- Domain-Driven Design (pure domain functions)

### Overview

A layered architecture for managing complex state transitions in applications (like board games) that separates concerns into four distinct layers:

1. Actions - Events that describe what happened
2. Domain - Pure business logic functions
3. Reducers - Pure state transformation functions
4. Use Cases - Orchestration layer that coordinates domain logic and reducers

### The Layers Explained

#### Domain Layer (Pure Business Logic)

- Pure, deterministic functions
- Operate on domain entities (Player, Hotel, Card)
- No dependencies on GameState or orchestration concerns
- Reusable across different contexts (AI, simulation, validation)

```typescript
// Example: Check if a move is legal
function canPurchaseShares(
  player: Player,
  shares: Record<string, number>,
  hotels: Hotel[],
): boolean;
```

#### Reducers (State Transformations)

- Pure functions that transform state
- Take specific inputs, return state updates
- No orchestration or business flow logic
- Can be called by multiple use cases for reusable state changes

```typescript
// Example: Apply a share purchase
function buySharesReducer(
  state: GameState,
  shares: Record<string, number>,
  playerId: number,
  cost: number,
): Partial<GameState>;
```

#### Use Cases (Orchestration)

- Coordinate complex flows
- Handle turn/phase validation (orchestration concerns)
- Extract data from GameState
- Call domain functions for validation
- Call reducers for state transformation
- Compose multiple reducers/use cases
- Decide what happens next

```typescript
// Example: Orchestrate a share purchase
function buySharesUseCase(
  state: GameState,
  action: BuySharesAction,
): GameState {
  // 1. Orchestration validation (phase/turn)
  // 2. Extract data from state
  // 3. Domain validation
  // 4. Call reducer(s)
  // 5. Return next state
}
```

#### **Actions** (Events)

- Describe user intent or game events
- Routed by action handler to appropriate use case or reducer

**Data Flow**
Action
↓
Action Handler (routing)
↓
Use Case (orchestration)
├→ Domain Functions (validation/calculation)
├→ Reducer (state transformation)
└→ Other Use Cases (continued orchestration)
↓
New State

#### Key Principles

1. Reducers don't call use cases - Data flows one direction
2. Use cases can call reducers and other use cases - Composition is encouraged
3. Use cases and orchestrators always take and return a full game state
4. Domain functions are pure - No GameState, no side effects
5. Validation splits by concern:

- Orchestration checks (phase/turn) → Use case
- Business rules → Domain functions

6. Reusable reducers - Multiple actions can share the same reducer

#### Benefits

✅ Testability: Each layer can be tested in isolation
✅ Reusability: Domain functions and reducers are building blocks
✅ Clarity: Clear separation of "what's legal" vs "when it's legal"
✅ Flexibility: Easy to compose complex flows from simple pieces
✅ Type Safety: TypeScript enforces contracts between layers

#### When to Use What

| Component                        | Use When                                                |
| -------------------------------- | ------------------------------------------------------- |
| Domain Function                  | Pure business logic, reusable calculations              |
| Reducer                          | State transformation needed by multiple actions         |
| Use Case                         | Complex orchestration, multiple steps, phase management |
| Direct Reducer in Action Handler | Simple, single-step state change                        |

##### Comparison to Redux

| Aspect       | Redux                     | This Pattern                         |
| ------------ | ------------------------- | ------------------------------------ |
| Reducers     | Top-level action handlers | Composable building blocks           |
| Middleware   | Handles side effects      | Use cases handle orchestration       |
| Selectors    | Read state                | Domain functions operate on entities |
| Thunks/Sagas | Async orchestration       | Use cases handle sync orchestration  |

#### Example Flow

```typescript
// 1. Simple action - maps directly to reducer
[ActionTypes.ADD_PLAYER]: addPlayerReducer

// 2. Complex action - needs orchestration
[ActionTypes.BUY_SHARES]: buySharesUseCase
  → validates phase/turn
  → calls canPurchaseShares() [domain]
  → calls buySharesReducer() [reducer]
  → calls advancePlayerUseCase() [use case]
  → returns new state

// 3. Shared reducer - called by multiple use cases
resolveMergerReducer()
  ← called by breakMergerTieUseCase
  ← called by playTileUseCase
  ← called by others...
```

#### Blog Post Structure

If you were writing this up, I'd suggest:
**Title**: "Beyond Redux: A Composable Architecture for Complex State Management"

##### Sections

1. The Problem (Redux works but can get messy for complex flows)
2. The Solution (Layered architecture with composable reducers)
3. The Four Layers (detailed explanation)
4. Real Example (walk through a complex action)
5. Lessons Learned (what works, what doesn't)
6. When to Use This (game engines, workflow engines, complex business logic)

## Your Revised Architecture

┌─────────────────────────────────────┐
│ Action Dispatcher │
│ - Routes ALL actions to use cases │
└──────────────┬──────────────────────┘
│
▼
┌─────────────────────────────────────┐
│ Use Cases (Entry Points) │
│ - ALWAYS validate orchestration │
│ - Decide: inline, reducer, or │
│ orchestrator? │
└──────────────┬──────────────────────┘
│
├─ Simple? Inline update
├─ Medium? Call reducer
└─ Complex? Call orchestrator
↓
┌─────────────────────┐
│ Orchestrators │
│ - Multi-step flows │
│ - Call reducers │
└──────────┬──────────┘
│
▼
┌─────────────────────┐
│ Reducers │
│ - State transform │
└─────────────────────┘

### Summary Table

| Layer           | Input              | Output                          | Purpose             |
| --------------- | ------------------ | ------------------------------- | ------------------- |
| UseCase         | GameState + Action | GameState                       | Validate & delegate |
| Orchestrator    | GameState + params | GameState                       | Manage flow         |
| Reducer         | Flexible           | GameState or Partial<GameState> | Transform state     |
| Domain Function | Specific types     | Specific types                  | Pure logic          |

### The "Use Case Litmus Test"If your use case has any of these, it's doing too much

- ❌ Multiple orchestration decisions ("if this then that flow")
- ❌ Complex state transformations
- ❌ Calling multiple reducers/orchestrators

### What Use Cases SHOULD Have

✅ **Phase/turn/permission checks** (orchestration validation)
✅ **Business rule validation calls** (delegate to domain)
✅ **ONE delegation** (to orchestrator, reducer, or inline)

## Your Architecture Refined

Action Dispatcher
↓
Use Case (Entry Point)
├─ Validate: Is this allowed RIGHT NOW?
└─ Delegate to ONE of:
│
├─ Orchestrator (complex multi-step flow)
│ ├─ Makes flow decisions
│ ├─ Calls reducers
│ └─ Calls other orchestrators
│
├─ Reducer (state transformation)
│ └─ Pure state update
│
└─ Inline (trivial update)
└─ return { ...gameState, flag: true }

## The Rule of Thumb

If you're writing more than ~15 lines in a use case, you're probably doing orchestration or transformation that should be extracted.

A use case should be:

- ~5-10 lines of validation
- 1 line of delegation
- Total: ~10-15 lines max

If it's longer, ask:

- "Am I making flow decisions?" → Extract to orchestration
- "Am I transforming state?" → Extract to reduce
- "Am I doing complex calculations?" → Extract to domain function

## Your Refined Rules (Final Version)

1. All actions go through use cases - Use cases are the entry point
2. Use cases validate and delegate - Phase/turn checks + business validation, then ONE delegation
3. Orchestrators manage multi-step flows - Can call reducers and other orchestrators
4. Reducers transform state - Pure state updates, can call domain functions
5. Domain functions are pure - No GameState, no side effects
6. Validation splits by concern:

- Orchestration checks (phase/turn) → Use case (inline)
- Business rules → Domain functions (extracted)
