import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { processMergerOrchestrator } from '../../orchestrators/processMergerOrchestrator.ts';
import { breakMergerTieUseCase, resolveMergerUseCase } from '../../usecases/index.ts';
import { getActivePlayer, getHotelPrice } from '../../utils/index.ts';
import {
  type BoardTile,
  GamePhase,
  type GameState,
  type Hotel,
  type HOTEL_NAME,
  type PlayerAction,
  type Tile,
} from '../../types/index.ts';

const hotelTiles = (hotel: HOTEL_NAME, row: number, count: number): Tile[] =>
  Array.from({ length: count }, (_, col) => ({ row, col, location: 'board', hotel }));

// owners lists the player id holding each non-bank share
const makeHotel = (name: HOTEL_NAME, owners: number[] = []): Hotel => ({
  name,
  shares: Array.from({ length: 25 }, (_, i) => ({ location: i < owners.length ? owners[i] : 'bank' })),
});

const heldShares = (state: GameState, hotel: HOTEL_NAME, playerId: number) =>
  state.hotels.find((h) => h.name === hotel)!.shares.filter((s) => s.location === playerId).length;

const actionText = (actions: PlayerAction[]) => actions.map((a) => a.action);

// P0 plays a tile joining Worldwide (3), Luxor (3), and Festival (2)
const makeMergeState = (): GameState => ({
  gameId: 'merge-flow',
  owner: 'P0',
  currentPhase: GamePhase.PLAY_TILE,
  currentTurn: 1,
  currentPlayer: 0,
  lastUpdated: Date.now(),
  players: [
    { id: 0, name: 'P0', money: 6000 },
    { id: 1, name: 'P1', money: 6000 },
    { id: 2, name: 'P2', money: 6000 },
  ],
  hotels: [
    makeHotel('Worldwide', [1, 1, 0]),
    makeHotel('Luxor', [2]),
    makeHotel('Festival', [2]),
  ],
  tiles: [
    ...hotelTiles('Worldwide', 0, 3),
    ...hotelTiles('Luxor', 2, 3),
    ...hotelTiles('Festival', 4, 2),
    { row: 1, col: 5, location: 'board' },
  ],
  mergeContext: {
    originalHotels: ['Worldwide', 'Luxor', 'Festival'],
    additionalTiles: [{ row: 1, col: 5, location: 'board' }],
  },
} as unknown as GameState);

Deno.test('integration - three hotel merger with a tie runs to buy shares', async (t) => {
  let state = makeMergeState();
  let actions: PlayerAction[] = [];

  await t.step('tie for largest hotel asks the merging player to pick', () => {
    [state, actions] = processMergerOrchestrator(state);
    assertEquals(state.currentPhase, GamePhase.BREAK_MERGER_TIE);
    assertEquals(state.mergerTieContext?.tiedHotels, ['Worldwide', 'Luxor']);
  });

  await t.step('breaking the tie merges Worldwide and pays bonuses', () => {
    [state, actions] = breakMergerTieUseCase(state, {
      type: 'BREAK_MERGER_TIE',
      payload: { player: 'P0', resolvedTie: { survivor: 'Luxor', merged: 'Worldwide' } },
    });
    assertEquals(state.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(state.mergerTieContext, undefined);
    assertEquals(state.mergeContext?.survivingHotel, 'Luxor');
    assertEquals(state.mergeContext?.mergedHotel, 'Worldwide');
    assertEquals(state.mergeContext?.mergedHotelSize, 3);
    assertEquals(state.mergeContext?.originalHotels, ['Festival']);
    // Turn order starting with the merging player
    assertEquals(state.mergeContext?.stockholderIds, [0, 1]);
    assertEquals(getActivePlayer(state), 0);
    const text = actionText(actions);
    assertEquals(text[0], 'P0 merged Worldwide into Luxor');
    const { majority, minority } = getHotelPrice('Worldwide', 3);
    assertEquals(text.includes(`P1 was paid $${majority}`), true);
    assertEquals(text.includes(`P0 was paid $${minority}`), true);
  });

  await t.step('merging player sells at the pre-merger price', () => {
    const before = state.players[0].money;
    const price = getHotelPrice('Worldwide', 3).price;
    // Worldwide's tiles belong to Luxor now, so the board alone would give the wrong price
    assertNotEquals(price, getHotelPrice('Worldwide', 0).price);
    [state, actions] = resolveMergerUseCase(state, {
      type: 'RESOLVE_MERGER',
      payload: { player: 'P0', shares: { sell: 1, trade: 0 } },
    });
    assertEquals(state.players[0].money, before + price);
    assertEquals(heldShares(state, 'Worldwide', 0), 0);
    assertEquals(actionText(actions), [`P0 sold 1 shares of Worldwide for $${price}`]);
    assertEquals(state.mergeContext?.stockholderIds, [1]);
    assertEquals(getActivePlayer(state), 1);
  });

  await t.step('last stockholder trades, then the next merger starts', () => {
    [state, actions] = resolveMergerUseCase(state, {
      type: 'RESOLVE_MERGER',
      payload: { player: 'P1', shares: { sell: 0, trade: 2 } },
    });
    assertEquals(heldShares(state, 'Luxor', 1), 1);
    assertEquals(heldShares(state, 'Worldwide', 1), 0);
    const text = actionText(actions);
    assertEquals(text[0], 'P1 traded 2 shares of Worldwide for 1 of Luxor');
    assertEquals(text.includes('P0 merged Festival into Luxor'), true);
    assertEquals(state.currentPhase, GamePhase.RESOLVE_MERGER);
    assertEquals(state.mergeContext?.survivingHotel, 'Luxor');
    assertEquals(state.mergeContext?.mergedHotel, 'Festival');
    assertEquals(state.mergeContext?.mergedHotelSize, 2);
    assertEquals(state.mergeContext?.originalHotels, []);
    assertEquals(state.mergeContext?.stockholderIds, [2]);
  });

  await t.step('keeping shares finishes the merger', () => {
    [state, actions] = resolveMergerUseCase(state, {
      type: 'RESOLVE_MERGER',
      payload: { player: 'P2' },
    });
    assertEquals(actionText(actions), ['P2 kept 1 shares of Festival']);
    assertEquals(heldShares(state, 'Festival', 2), 1);
    assertEquals(state.currentPhase, GamePhase.BUY_SHARES);
    assertEquals((state.tiles as BoardTile[]).filter((tile) => tile.hotel === 'Luxor').length, 9);
  });
});
