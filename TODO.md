# TO DO

## Misc

- end game
- ttl/culling of old games

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

2. **Error persistence across views**: If players might navigate between different views while an error is active, decide whether the error should persist or be cleared on navigation.
