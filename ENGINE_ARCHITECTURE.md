# Action-Reducer-UseCase Architecture
A Composable Pattern for Complex State Management

## What Is This?

A layered architecture for managing complex state transitions in applications (like board games) that separates concerns into four distinct layers:

- Actions - Events that describe what happened
- Domain - Pure business logic functions
- Reducers - Pure state transformation functions
- Use Cases - Orchestration layer that coordinates domain logic and reducers

### Influences

- Redux (unidirectional data flow, reducers)
- Clean Architecture (use cases, domain layer)
- Domain-Driven Design (pure domain functions)

### The Four Layers Explained

#### 1. Domain Layer (Pure Business Logic)

Purpose: Pure, deterministic business rules and calculations

Characteristics:

- Operate on domain entities (Player, Hotel, Card, etc.)
- No dependencies on GameState or orchestration concerns
- Reusable across different contexts (AI, simulation, validation)
- Completely pure - same inputs always produce same outputs

Example:

```typescript
// Check if a move is legal based on business rules
function canPurchaseShares(
  player: Player,
  shares: Record<string, number>,
  hotels: Hotel[],
): boolean;
```
#### 2. Reducers (State Transformations)

Purpose: Pure functions that apply specific state changes

Characteristics:

- Take specific inputs, return state updates (GameState or Partial)
- No orchestration or business flow logic
- Can be called by multiple use cases (reusable building blocks)
- Can call domain functions for validation/calculation

Example:

```typescript
// Apply a share purchase to state
function buySharesReducer(
  state: GameState,
  shares: Record<string, number>,
  playerId: number,
  cost: number,
): Partial<GameState>;
```

#### 3. Use Cases (Entry Points)

Purpose: Validate that an action is allowed RIGHT NOW, then delegate

Characteristics:

- Entry point for all actions
- Handle orchestration validation (phase/turn/permission checks)
- Delegate to ONE of: orchestrator, reducer, or inline update
- Should be concise (~10-15 lines max)

What Use Cases SHOULD Have:

- ✅ Phase/turn/permission checks (orchestration validation)
- ✅ Business rule validation calls (delegate to domain)
- ✅ ONE delegation (to orchestrator, reducer, or inline)

What Use Cases Should NOT Have:

- ❌ Multiple orchestration decisions ("if this then that flow")
- ❌ Complex state transformations
- ❌ Calling multiple reducers/orchestrators

Example:

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

#### 4. Orchestrators (Multi-Step Flows)

Purpose: Manage complex, multi-step state transitions

Characteristics:

- Handle flows with multiple decision points
- Call reducers for state transformations
- Can call other orchestrators for composition
- Make flow decisions based on state

Example:

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

### Data Flow

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

### Key Principles

#### The Mental Model

Use Cases can call:

- ✓ Domain functions (validation, calculations)
- ✓ Reducers (state transformations)
- ✓ Orchestrators (complex flows)

Orchestrators can call:

- ✓ Domain functions (validation, calculations)
- ✓ Reducers (state transformations)
- ✓ Other orchestrators (composition)

Reducers can call:

- ✓ Domain functions (validation, calculations)
- ✗ NOT use cases or orchestrators

Domain functions can call:

- ✓ Other domain functions
- ✗ Nothing else

#### Core Rules

- All actions go through use cases - Use cases are always the entry point
- Use cases validate and delegate - Orchestration checks + business validation, then ONE delegation
- Orchestrators manage multi-step flows - Can call reducers and other orchestrators
- Reducers transform state - Pure state updates, can call domain functions
- Domain functions are pure - No GameState, no side effects
- Validation splits by concern:
    - Orchestration checks (phase/turn/permission) → Use case
    - Business rules (game logic) → Domain functions

#### When to Use What

| Component | Use When | Example |
|---|---|---|
| Domain Function | Pure business logic, reusable calculations | `canPurchaseShares()`, `calculateCost()` |
| Reducer | State transformation needed by multiple actions | `buySharesReducer()`, `addPlayerReducer()` |
| Orchestrator | Multi-step flow with decision points | `resolveMergerOrchestrator()` |
| Inline (in Use Case) | Trivial single-property update | `return { ...state, flag: true }` |

#### Example Flows

**Simple Action (Direct to Reducer)**
```
[ActionTypes.ADD_PLAYER]: addPlayerUseCase
  → validates phase
  → calls addPlayerReducer()
  → returns new state
```

**Complex Action (Uses Orchestrator)**
```
[ActionTypes.BUY_SHARES]: buySharesUseCase
  → validates phase/turn
  → calls canPurchaseShares() [domain]
  → calls buySharesOrchestrator() [orchestrator]
      → calls buySharesReducer() [reducer]
      → calls advancePlayerOrchestrator() [orchestrator]
  → returns new state
```

**Shared Reducer (Reusable Building Block)**
```
resolveMergerReducer()
  ← called by breakMergerTieOrchestrator
  ← called by playTileOrchestrator
  ← called by other orchestrators...
```

### Benefits

✅ Testability - Each layer can be tested in isolation
✅ Reusability - Domain functions and reducers are composable building blocks
✅ Clarity - Clear separation of "what's legal" (domain) vs "when it's legal" (use case)
✅ Flexibility - Easy to compose complex flows from simple pieces
✅ Type Safety - TypeScript enforces contracts between layers
✅ Maintainability - Each component has a single, clear responsibility

### Comparison to Redux

| Aspect | Redux | This Pattern |
|---|---|---|
| Reducers | Top-level action handlers | Composable building blocks |
| Middleware | Handles side effects | Use cases + orchestrators handle flows |
| Selectors | Read state | Domain functions operate on entities |
| Thunks/Sagas | Async orchestration | Orchestrators handle sync flows |

### The "Use Case Litmus Test"

If your use case is longer than ~15 lines, ask:

- "Am I making flow decisions?" → Extract to orchestrator
- "Am I transforming state?" → Extract to reducer
- "Am I doing complex calculations?" → Extract to domain function

A good use case structure:

- 5-10 lines of validation
- 1 line of delegation
- Total: ~10-15 lines max

### Summary

| Layer | Input | Output | Purpose |
|---|---|---|---|
| Use Case | GameState + Action | GameState | Validate & delegate |
| Orchestrator | GameState + params | GameState | Manage multi-step flows |
| Reducer | Flexible | GameState or Partial | Transform state |
| Domain | Specific types | Specific types | Pure business logic |

This architecture emerged from evolving a Redux-style implementation to handle the complexity of asynchronous board game state management, where simple action→reducer patterns weren't sufficient for multi-step game flows involving mergers, complex turn transitions, and an event-driven action model.
