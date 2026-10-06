import { completeMergerReducer } from '../completeMergerReducer.ts';
import {
  assertEquals,
  assertExists,
  assertThrows,
} from '@std/assert';
import { GameError, type GameState, type Hotel } from '../../types/index.ts';

const makeState = (mergedHotelSize?: number) =>
  ({
    players: [
      { id: 0, name: 'Alice', money: 100 },
      { id: 1, name: 'Bob', money: 200 },
    ],
    hotels: [
      { name: 'Tower', shares: [{ location: 1 }, { location: 'bank' }] },
      { name: 'Luxor', shares: [{ location: 1 }, { location: 1 }, { location: 'bank' }] },
    ],
    // Luxor's tiles already belong to Tower
    tiles: [{ row: 0, col: 0, location: 'board', hotel: 'Tower' }],
    mergeContext: {
      survivingHotel: 'Tower',
      mergedHotel: 'Luxor',
      mergedHotelSize,
      stockholderIds: [1],
      originalHotels: [],
      additionalTiles: [],
    },
  }) as unknown as GameState;

const survivor = (state: GameState) => state.hotels[0] as Hotel;
const merged = (state: GameState) => state.hotels[1] as Hotel;

Deno.test('completeMergerReducer: updates player money and hotel shares after merger', () => {
  const gameState = makeState(4);
  const [result, actions] = completeMergerReducer(
    gameState,
    1,
    undefined,
    survivor(gameState),
    merged(gameState),
  );
  assertExists(result.players);
  assertEquals(result.players.length, 2);
  assertExists(result.hotels);
  assertEquals(result.hotels.length, 2);
  assertEquals(actions[0].action, 'Bob kept 2 shares of Luxor');
});

Deno.test('completeMergerReducer: sells at the merged hotel size from the merge context', () => {
  const gameState = makeState(4);
  const [result, actions] = completeMergerReducer(
    gameState,
    1,
    { sell: 2, trade: 0 },
    survivor(gameState),
    merged(gameState),
  );
  // Luxor at size 4 sells for $400 a share
  assertEquals(result.players[1].money, 200 + 800);
  assertEquals(result.players[0].money, 100);
  assertEquals(actions[0].action, 'Bob sold 2 shares of Luxor for $800');
});

Deno.test('completeMergerReducer: throws when merged hotel size is missing', () => {
  const gameState = makeState(undefined);
  assertThrows(
    () =>
      completeMergerReducer(
        gameState,
        1,
        { sell: 1, trade: 0 },
        survivor(gameState),
        merged(gameState),
      ),
    GameError,
    'Missing merged hotel size',
  );
});
