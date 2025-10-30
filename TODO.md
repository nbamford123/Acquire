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

- should we put the current user in the user list, just so they know their place in the rotation?
- layout, board takes more available space
- give players unique colors?
- game state on page somewhere, at least until it's started

## Misc

- are we properly clearing the merger and found hotel contexts? Maybe that should automatically be part of advancing player turn?
- Action
  → ActionHandler
  → UseCase (orchestration + data extraction)
  → Domain validation (pure business rules)
  → Another UseCase (resolveMergerUseCase)
  → New State
- when phase shifts to buy_stocks and there are no stocks to buy, or player doesn't have enough money to buy any, auto-skip to next player with action detail?
- we don't need the first tile object in the player state, just list it in the actions array, like "Jamie drew tile A1, first player", etc.
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
- when the start game post method returns, it's in error but client still navigates game/null
- the client needs to check response codes and for game engine errors. Probably need a central handler (note the auth service does this)
- test request failures-- does client display an error?
- why do we need a player name when we create a game? Isn't it already in the auth cookie?
- same with start game action? Weren't we going to always pull the player from the cookie?
- pre-commit hook? Is that even possible?
- add at least a debug view where the api server logs requests and responses
- local dev hot reload doesn't seem to be working
- end game
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

Problems / risks I observed

Ambiguous responsibility boundaries

It's not always obvious what belongs in domain/ vs state/. For example: Should a complex merge (which needs to update players, hotels, payout calculations) be in domain/mergeHotelsOperation.ts (pure domain) or in state/gameStateUpdater.ts (stateful orchestration)?
In playTileReducer.ts you import boardTiles, getTile, updateTiles from domain/ (good), and handleMerger from state/ (ok). That indicates state/ is doing higher-level GameState changes while domain/ is pure model ops — but the boundary isn't strongly enforced.
Naming confusion

state/gameStateUpdater.ts suggests low-level updates but it's actually an orchestrator that can enact business processes (merger resolution, payouts). state is a very generic name and competes conceptually with reducers/.
reducers/ suggests Redux-style pure reducers. Mixing heavy logic inside reducers vs in state/ can produce duplicate responsibilities.
Potential for circular dependencies or leakage of GameState into domain

Domain should remain independent of the GameState shape and of player wiring. If domain modules start importing types that represent GameState or player arrays, you risk coupling the pure logic to app state.
Mixed levels of abstraction in reducers

playTileReducer.ts does validation, determines outcomes, and also calls into orchestration; it's doing three levels of work:
Validate action (action-level)
Decide domain outcome (domain-level)
Apply Big changes (orchestration via state/)
It’s fine to do that, but a clearer contract would help: reducers should validate/translate the action, call a use-case that returns a Partial<GameState>, then merge it.
Concrete suggestions (prioritized)

Clarify layer responsibilities (minimal, high-impact)

domain/ : Pure, deterministic functions that operate on domain models (Tile[], Hotel[], etc.). No GameState, no player turn logic. Examples: hotelOperations.ts, mergeHotelsOperation.ts, calculateShareholderPayoutsOperation.ts, getTile, boardTiles, sharePrice.
usecases/ or application/ (rename from state/) : Orchestrators that accept GameState (or relevant slices) and return Partial<GameState>. They coordinate domain functions and apply game rules that require knowledge of players, phases, or global state. Example: resolveMergerUseCase, playTileUseCase, foundHotelUseCase.
reducers/ : Thin action handlers that validate the action and invoke the appropriate usecase/orchestrator, then merge returned Partial<GameState> into the current GameState. Keep them small and testable.
Keep core/ for engine/driver-level code (initialization, turn loop).
Why: this makes dependencies directional:
reducers -> usecases -> domain -> utils
and prevents domain importing state/usecases.

Rename state/ to usecases/ or application/

state is ambiguous and collides with reducers. A name like usecases/ (or orchestrators/) documents intent: higher-level game use-cases that understand players and phases.
Ensure domain functions accept and return domain models only

Domain functions should have signatures like:
mergeHotelsOperation(hotels: Hotel[], tiles: Tile[], ...): { hotels: Hotel[], payouts: PayoutInfo, changedTiles: Tile[] }
No GameState or players arrays unless you intentionally treat them as domain data.
Move high-level GameState changes into usecases

Example: handleMerger currently in state/gameStateUpdater.ts — make sure it is an orchestrator/usecase that calls domain operations for payouts and returns a Partial<GameState>. If parts of merger logic are pure domain (finding largest hotel, selecting shareholders, calculating payouts) extract those into domain/mergeHotelsOperation.ts.
Keep only stateful concerns (advance phase, assign money to players, update currentPlayer) in the usecase.
Keep reducers thin

playTileReducer should:
Validate the action and tile ownership (ok to stay here),
Build minimal domain input (tile, tiles, hotels),
Call usecases/playTileUseCase(gameState, tile),
Merge Partial<GameState> returned by usecase.
This already mostly matches your playTileReducer.ts. Strengthen the pattern by extracting logic like determinePlayTileOutcome into domain or usecase depending on purity.
Add and maintain layer purity tests

Domain unit tests should only reference domain functions and run without GameState structures.
Usecase tests should provide a GameState fixture and assert returned Partial<GameState>.
Reducer tests should assert that reducer merges returned partial state into game state and that validation rejects invalid actions.
Suggested directory layout (example)

engine/
domain/ # pure business logic (no GameState)
hotelOperations.ts
mergeHotelsOperation.ts
calculateShareholderPayoutsOperation.ts
index.ts
usecases/ # orchestrators that accept GameState and return Partial<GameState>
playTileUseCase.ts (rename/move from state/gameStateUpdater.ts or split)
resolveMergerUseCase.ts
reducers/
playTileReducer.ts # thin wrappers that call usecases
...
core/
actions/
types/
utils/
A concrete, low-risk refactor you can apply now

Rename state/gameStateUpdater.ts -> usecases/playTileUseCase.ts and change its exported functions to be single-purpose use cases (e.g., handleMerger -> resolveMergerUseCase). Keep its signature returning Partial<GameState> so reducers remain unchanged.
Extract purely computational pieces of the merger (payout calculations, largest-hotel-finder) into domain/mergeHotelsOperation.ts. Then resolveMergerUseCase calls domain operations and packages the resulting changes into a Partial<GameState>.
Example function signature to standardize across usecases

Domain function (pure):
mergeHotelsOperation(hotels: Hotel[], board: BoardTile[], original: HOTEL_NAME[], extraTiles: Tile[]):
returns { updatedHotels: Hotel[], payouts: Payout[], tilesToAssign: Tile[] }
Usecase (stateful orchestrator):
resolveMergerUseCase(gameState: GameState, args: { originalHotels: HOTEL_NAME[], additionalTiles: Tile[] }): Partial<GameState>
Edge cases / test checklist (important)

Invalid tile placement, wrong player turn, and invalid phase (reducer validation covers them).
Merge tie resolution(s) — ensure tie-breaker logic is pure and well-tested.
Situations where no available shares exist — ensure foundHotel logic handles lack of bank shares.
Ensure no domain function mutates inputs (return new objects).
Verify there are no circular imports (domain must not import usecases/reducers).
Quality gates to run after refactor

Build typecheck / linter (TypeScript/Deno). Expect to fix import path renames.
Unit tests:
Domain functions: ensure pure outputs remain consistent.
Usecases: assert Partial<GameState> shape and correctness.
Reducers: assert returned game state and that invalid actions throw GameError.
Next steps I can do for you

If you want, I can:
Propose concrete file moves/renames and produce diffs for a small refactor (rename state/ -> usecases/ and move/resurface handleMerger),
Extract one pure function from merger logic into domain/ and show tests for it,
Or write a short README.md in engine documenting layer responsibilities.
Which of those would you like me to implement now? I can make the rename + one small extraction (and update imports in playTileReducer.ts) in this session.

## The mental model:

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

```
┌─────────────────────────────────────┐
│  Action Dispatcher                  │
│  - Routes ALL actions to use cases  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Use Cases (Entry Points)           │
│  - ALWAYS validate orchestration    │
│  - Decide: inline, reducer, or      │
│    orchestrator?                    │
└──────────────┬──────────────────────┘
               │
               ├─ Simple? Inline update
               ├─ Medium? Call reducer
               └─ Complex? Call orchestrator
                    ↓
          ┌─────────────────────┐
          │  Orchestrators      │
          │  - Multi-step flows │
          │  - Call reducers    │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  Reducers           │
          │  - State transform  │
          └─────────────────────┘
```

#### Summary Table

| Layer           | Input              | Output                          | Purpose             |
| --------------- | ------------------ | ------------------------------- | ------------------- |
| UseCase         | GameState + Action | GameState                       | Validate & delegate |
| Orchestrator    | GameState + params | GameState                       | Manage flow         |
| Reducer         | Flexible           | GameState or Partial<GameState> | Transform state     |
| Domain Function | Specific types     | Specific types                  | Pure logic          |

#### The "Use Case Litmus Test"If your use case has any of these, it's doing too much:

- ❌ Multiple orchestration decisions ("if this then that flow")
- ❌ Complex state transformations
- ❌ Calling multiple reducers/orchestrators


## What Use Cases SHOULD Have

✅ **Phase/turn/permission checks** (orchestration validation)
✅ **Business rule validation calls** (delegate to domain)
✅ **ONE delegation** (to orchestrator, reducer, or inline)

## Your Architecture Refined

```
Action Dispatcher
  ↓
Use Case (Entry Point)
  ├─ Validate: Is this allowed RIGHT NOW?
  └─ Delegate to ONE of:
      │
      ├─ Orchestrator (complex multi-step flow)
      │   ├─ Makes flow decisions
      │   ├─ Calls reducers
      │   └─ Calls other orchestrators
      │
      ├─ Reducer (state transformation)
      │   └─ Pure state update
      │
      └─ Inline (trivial update)
          └─ return { ...gameState, flag: true }
```

## The Rule of Thumb

If you're writing more than ~15 lines in a use case, you're probably doing orchestration or transformation that should be extracted.

A use case should be:
- ~5-10 lines of validation
- 1 line of delegation
- Total: ~10-15 lines max


If it's longer, ask:

- "Am I making flow decisions?" → Extract to orchestrato
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