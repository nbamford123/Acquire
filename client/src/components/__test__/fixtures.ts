import {
  GamePhase,
  HOTEL_CONFIG,
  HOTEL_NAMES,
  type HOTEL_NAME,
  type HotelView,
  type PlayerView,
} from '@acquire/engine/types';
import { getHotelPrice } from '@acquire/engine/utils';

type HotelState = Pick<HotelView, 'shares' | 'size'>;

// A hotel as the view shows it, with its type and prices filled in the way the engine does
const hotelView = (name: HOTEL_NAME, hotel: HotelState): HotelView => ({
  ...hotel,
  type: HOTEL_CONFIG[name],
  ...getHotelPrice(name, hotel.size),
});

// Every hotel off the board with all its shares in the bank, plus any overrides
export const hotelsWith = (hotels: Partial<Record<HOTEL_NAME, HotelState>> = {}) =>
  Object.fromEntries(
    HOTEL_NAMES.map((name) => [name, hotelView(name, hotels[name] ?? { shares: 25, size: 0 })]),
  ) as Record<HOTEL_NAME, HotelView>;

// nate (you) and alice, early in the game, nate to play a tile
export const makePlayerView = (overrides: Partial<PlayerView> = {}): PlayerView => ({
  gameId: 'test-game',
  owner: 'nate',
  playerId: 0,
  money: 6000,
  stocks: {} as Record<HOTEL_NAME, number>,
  tiles: [{ row: 0, col: 0 }],
  currentPhase: GamePhase.PLAY_TILE,
  currentTurn: 2,
  currentPlayer: 0,
  lastUpdated: 100,
  players: [
    { name: 'nate', money: 6000, shares: {} as PlayerView['players'][number]['shares'] },
    { name: 'alice', money: 6000, shares: {} as PlayerView['players'][number]['shares'] },
  ],
  hotels: hotelsWith(),
  board: [],
  actions: [],
  ...overrides,
});

// Adds a Lit element to the document with the given properties and waits for it to render
export const mount = async (tag: string, properties: Record<string, unknown>) => {
  const element = document.createElement(tag) as HTMLElement & Record<string, unknown> & {
    updateComplete: Promise<boolean>;
  };
  Object.assign(element, properties);
  document.body.append(element);
  await settle(element);
  return element;
};

// Lets pending events and fetches finish, then waits for the element's next render
export const settle = async (element: { updateComplete: Promise<boolean> }) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
};
