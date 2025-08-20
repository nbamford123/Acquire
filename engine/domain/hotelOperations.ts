import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type Share,
  SharePrices,
} from '../../shared/types/index.ts';
import { SAFE_HOTEL_SIZE } from '../../shared/types/gameConfig.ts';

const initializeShares = (): Share[] => Array.from({ length: 25 }, () => ({ location: 'bank' }));

const initializeHotel = (name: HOTEL_NAME, type: HOTEL_TYPE): Hotel => ({
  name: name,
  type: type,
  shares: initializeShares(),
});

export const initializeHotels = (): Hotel[] => [
  initializeHotel('Worldwide', 'economy'),
  initializeHotel('Sackson', 'economy'),
  initializeHotel('Festival', 'standard'),
  initializeHotel('Imperial', 'standard'),
  initializeHotel('American', 'standard'),
  initializeHotel('Continental', 'luxury'),
  initializeHotel('Tower', 'luxury'),
];

export const remainingShares = (hotel: Hotel) =>
  hotel.shares.filter((s) => s.location === 'bank').length;

export const assignSharesToPlayer = (shares: Share[], playerId: number, count = 1) => {
  let assigned = 0;
  return shares.map((share) => {
    if (share.location === 'bank' && assigned < count) {
      assigned++;
      return { ...share, location: playerId };
    }
    return share;
  });
};

export const returnSharesToBank = (shares: Share[], playerId: number, count = 1) => {
  let returned = 0;
  return shares.map((share) => {
    if (share.location === playerId && returned < count) {
      returned++;
      return { ...share, location: 'bank' as const };
    }
    return share;
  });
};

export const hotelTiles = (hotel: HOTEL_NAME, tiles: BoardTile[]) =>
  tiles.filter((tile) => tile.hotel && tile.hotel === hotel);

const findCurrentHotelPrice = (hotel: Hotel, tiles: BoardTile[]) => {
  const size = hotelTiles(hotel.name, tiles).length;
  const prices = SharePrices[hotel.type];
  for (const [bracket, price] of Object.entries(prices)) {
    if (size <= Number(bracket)) {
      return price;
    }
  }
  throw new GameError(
    'No price bracket found - check SharePrices configuration',
    GameErrorCodes.GAME_PROCESSING_ERROR,
  );
};
export const sharePrice = (hotel: Hotel, tiles: BoardTile[]): number =>
  findCurrentHotelPrice(hotel, tiles).price;

export const majorityMinorityValue = (hotel: Hotel, tiles: BoardTile[]) => {
  const price = findCurrentHotelPrice(hotel, tiles);
  return [price.majority, price.minority];
};

export const hotelSafe = (hotel: HOTEL_NAME, tiles: BoardTile[]): boolean =>
  hotelTiles(hotel, tiles).length >= SAFE_HOTEL_SIZE;

export const getTiedHotels = (
  hotel: HOTEL_NAME,
  hotels: HOTEL_NAME[],
  tiles: BoardTile[],
): HOTEL_NAME[] => {
  const targetSize = hotelTiles(hotel, tiles).length;
  return hotels.filter((h) => hotelTiles(h, tiles).length === targetSize);
};

export const getHotelsByNames = (hotels: Hotel[], names: HOTEL_NAME[]) =>
  names.map((name) => {
    const hotel = hotels.find((h) => h.name === name);
    if (!hotel) {
      throw new GameError(`Hotel not found: ${name}`, GameErrorCodes.GAME_PROCESSING_ERROR);
    }
    return hotel;
  });
