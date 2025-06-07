* create break tie action-- will still call play tile reducer
* create resolve merge action/reducer
* go over tests, better/more complete
* what happens when a merge tile is played and there's a floating tile that doesn't belong to a hotel but will be snapped up? I say it's just added to the survivor at the end.
* actions! Need a new action state apart from the game state, it can be like 
* make sure to clear pendingPlayerId regularly-- definitely after any action it might have been used
```typescript
interface gameAction {
  turn: number;
  actions: {
    player: string[];
  }
}
```
then the server can send game actions along with the state update, it will be everything that's happened since your last turn, which mean we will have 
to filter and cull the actions

// Game state approach: We mutate objects during turn processing for simplicity,
// but maintain clean state boundaries when persisting between turns.

Shared Types:

Consider creating a shared types package or ensuring types can be imported across boundaries
Example: src/engine/types might need to be accessible from both service and client


Engine as a Package:

You could even make the engine a separate npm package within your monorepo
This enforces clean separation and makes dependencies explicit


Adapters:

Create adapter layers in the service to convert between engine types and external types
Example: src/service/adapters/gameStateAdapter.ts to map between DB schema and game state


Configuration:

Environment-specific configuration should live in the respective directories
Example: Game rules in engine/config, API URLs in service/config, UI settings in client/config

src/
├── engine/                // Core game logic (pure functions)
│   ├── config/            // Game configuration
│   │   └── gameConfig.ts  // Board size, max players, etc.
│   ├── types/             // Type definitions
│   │   ├── index.ts       // Re-exports all types
│   │   ├── gameState.ts   // Core game state
│   │   ├── actions.ts     // Action types
│   │   ├── errors.ts      // Error types & utilities
│   │   └── players.ts     // Player-related types
│   ├── core/              // Core game engine
│   │   ├── gameEngine.ts  // Main game logic processor
│   │   └── stateValidation.ts // Validation functions
│   ├── domain/            // Domain-specific logic
│   │   ├── tiles.ts       // Tile-related functions
│   │   ├── hotels.ts      // Hotel-related functions
│   │   └── players.ts     // Player-related functions
│   ├── actions/           // Action creators
│   │   ├── index.ts
│   │   ├── tileActions.ts
│   │   └── hotelActions.ts
│   ├── reducers/          // State reducers
│   │   ├── index.ts       // Root reducer
│   │   ├── tileReducers.ts
│   │   └── hotelReducers.ts
│   └── utils/             // Game-specific utilities
│       ├── boardUtils.ts
│       └── scoreCalculation.ts
│
├── service/               // Server-side code (serverless functions)
│   ├── handlers/          // API handlers
│   │   ├── gameHandlers.ts // Game action endpoints
│   │   └── userHandlers.ts // User management endpoints
│   ├── db/                // Database access
│   │   ├── gameRepository.ts // Game state persistence
│   │   └── userRepository.ts // User data persistence
│   ├── views/             // View models
│   │   └── playerViews.ts // Player-specific state filtering
│   ├── auth/              // Authentication & authorization
│   │   ├── authMiddleware.ts
│   │   └── playerPermissions.ts
│   ├── websocket/         // Real-time updates (if applicable)
│   │   └── notificationService.ts
│   └── utils/             // Service-specific utilities
│       └── logging.ts
│
└── client/                // Client-side code
    ├── components/        // UI components
    │   ├── Board.tsx
    │   ├── HotelMarker.tsx
    │   └── PlayerInfo.tsx
    ├── hooks/             // React hooks (if using React)
    │   ├── useGameState.ts
    │   └── useActions.ts
    ├── services/          // Client-side services
    │   ├── api.ts         // API communication
    │   └── gameStateCache.ts // Local state management
    ├── types/             // Client-specific types
    │   └── uiState.ts
    └── utils/             // Client-specific utilities
        ├── formatters.ts
        └── animations.ts


That's an excellent point! Handling player-specific views of the game state is a crucial aspect of multiplayer games where information hiding is important. This is sometimes called "fog of war" or "hidden information" in game design.
Here's how you can extend the architecture to handle this:

Introduce a View Model layer: This layer transforms the full game state into player-specific views.
Add a concept of "visibility": Define which parts of the state are visible to which players.

Let me show you how this could work:

```typescript
// types.ts (extended)
export interface GameState {
  board: Array<Array<string | null>>;
  players: Player[];
  currentPlayerIndex: number;
  // Hidden information
  playerHands: Record<string, Card[]>; // Maps player IDs to their hands
  drawPile: Card[];
  // Other state
}

export interface Card {
  id: string;
  type: string;
  value: number;
  // other card properties
}

export interface PlayerView {
  board: Array<Array<string | null>>;
  players: PlayerPublicInfo[];
  currentPlayerIndex: number;
  myHand: Card[] | null; // Only the requesting player's hand
  otherPlayerCardCounts: Record<string, number>; // Just the counts for other players
  drawPileCount: number; // Only the count, not the actual cards
  isMyTurn: boolean;
  // Other filtered information
}

export interface PlayerPublicInfo {
  id: string;
  name: string;
  score: number;
  // Other public player info
}

// viewModels.ts
import { GameState, PlayerView } from './types';

export function createPlayerView(state: GameState, playerId: string): PlayerView {
  return {
    // Information visible to everyone
    board: state.board,
    players: state.players.map(player => ({
      id: player.id,
      name: player.name,
      score: player.score,
      // Other public info
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    
    // Player-specific information
    myHand: state.playerHands[playerId] || null,
    otherPlayerCardCounts: Object.entries(state.playerHands)
      .filter(([id]) => id !== playerId)
      .reduce((counts, [id, hand]) => {
        counts[id] = hand.length;
        return counts;
      }, {} as Record<string, number>),
    
    // Hidden information converted to counts/metadata
    drawPileCount: state.drawPile.length,
    
    // Derived convenience properties
    isMyTurn: state.players[state.currentPlayerIndex]?.id === playerId,
  };
}
```

Additional Considerations for HTTP Transmission

* Separate error channels:

Consider separating transport/HTTP errors from game logic errors
You might want game errors in the state and HTTP errors handled separately


* Status codes:

Use appropriate HTTP status codes for transport-level issues
Put game logic errors in the payload with a successful 200 status


* Security:

Be cautious about what details you include in errors (no stack traces to clients)
Sanitize error messages that might contain sensitive information


* Size optimization:

If you're sending frequent updates, consider a diff-based approach rather than full state
You might want to omit errors from certain state updates if they haven't changed

```typescript
// Serializable game state
interface GameState {
  // Game properties
  error: {
    code: string;
    message: string;
    timestamp: number;
  } | null;
}

// Server-side processing
function processGameAction(gameId: string, action: GameAction): Response {
  try {
    // Get current game state
    const currentState = getGameState(gameId);
    
    // Process action
    const newState = rootReducer(currentState, action);
    
    // Save state
    saveGameState(gameId, newState);
    
    // Return new state
    return Response.json({ 
      success: true, 
      state: newState 
    });
  } catch (error) {
    // Handle unexpected server errors separately from game logic errors
    console.error("Server error processing game action:", error);
    return Response.json({ 
      success: false, 
      error: {
        code: "SERVER_ERROR",
        message: "An unexpected error occurred processing your request"
      }
    }, { status: 500 });
  }
}

// Client-side handling
async function dispatchGameAction(action: GameAction) {
  try {
    const response = await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, action })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Transport/server error
      showError(`Server error: ${data.error?.message || response.statusText}`);
      return;
    }
    
    if (data.success) {
      // Update local game state
      updateGameState(data.state);
      
      // Handle any game logic errors in the state
      if (data.state.error) {
        showGameError(data.state.error);
      }
    } else {
      // API-level error
      showError(data.error?.message || "Unknown error");
    }
  } catch (error) {
    // Network or parsing error
    showError("Connection error. Please check your network.");
  }
}
```
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
/>
```

2. **Error persistence across views**: If players might navigate between different views while an error is active, decide whether the error should persist or be cleared on navigation.
