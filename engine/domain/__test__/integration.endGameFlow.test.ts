import { assertEquals } from 'jsr:@std/assert';
import { buySharesUseCase } from '../../usecases/index.ts';
import {
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type Tile,
} from '../../types/index.ts';

const owned = (name: HOTEL_NAME, owners: number[]): Hotel => ({
  name,
  shares: Array.from(
    { length: 25 },
    (_, i) => ({ location: i < owners.length ? owners[i] : 'bank' }),
  ),
});

const row = (hotel: HOTEL_NAME, r: number, count: number): Tile[] =>
  Array.from({ length: count }, (_, col) => ({ row: r, col, location: 'board', hotel }));

// Tower (11 tiles) and American (12 tiles) are the only hotels on the board and both are safe
const makeState = (americanSize: number): GameState => ({
  gameId: 'end-game-flow',
  owner: 'P0',
  currentPhase: GamePhase.BUY_SHARES,
  currentTurn: 12,
  currentPlayer: 0,
  lastUpdated: Date.now(),
  players: [
    { id: 0, name: 'P0', money: 1000 },
    { id: 1, name: 'P1', money: 2000 },
  ],
  hotels: [owned('Tower', [0, 0, 0, 1]), owned('American', [1, 1]), owned('Festival', [])],
  tiles: [
    ...row('Tower', 0, 11),
    ...row('American', 1, americanSize),
    // P0 already played a tile this turn
    ...Array.from({ length: 5 }, (_, col) => ({ row: 8, col, location: 0 as const })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 7, col, location: 1 as const })),
    ...Array.from({ length: 6 }, (_, col) => ({ row: 6, col, location: 'bag' as const })),
  ],
});

Deno.test('integration - finishing a turn with every hotel safe ends and scores the game', () => {
  const [state, actions] = buySharesUseCase(makeState(12), {
    type: 'BUY_SHARES',
    payload: { player: 'P0', shares: {} as Record<HOTEL_NAME, number> },
  });

  assertEquals(state.currentPhase, GamePhase.GAME_OVER);
  assertEquals(state.players[0].money, 1000 + 7000 + 3 * 700);
  assertEquals(state.players[1].money, 2000 + 3500 + 700 + 12000 + 2 * 800);
  assertEquals(state.mergeContext, undefined);
  const text = actions.map((action) => action.action);
  assertEquals(text.includes('P1 finished with $19800'), true);
  assertEquals(text.includes('P0 finished with $10100'), true);
});

Deno.test('integration - the game continues while any hotel on the board is unsafe', () => {
  const [state] = buySharesUseCase(makeState(10), {
    type: 'BUY_SHARES',
    payload: { player: 'P0', shares: {} as Record<HOTEL_NAME, number> },
  });

  assertEquals(state.currentPhase, GamePhase.PLAY_TILE);
  assertEquals(state.currentPlayer, 1);
  assertEquals(state.players[0].money, 1000);
});
