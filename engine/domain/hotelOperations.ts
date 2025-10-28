import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  HOTEL_NAMES,
  SAFE_HOTEL_SIZE,
  type Share,
} from '../types/index.ts';
import { getHotelPrice } from '../utils/getHotelPrice.ts';

const initializeShares = (): Share[] => Array.from({ length: 25 }, () => ({ location: 'bank' }));

const initializeHotel = (name: HOTEL_NAME): Hotel => ({
  name: name,
  shares: initializeShares(),
});

export const initializeHotels = (): Hotel[] => HOTEL_NAMES.map(initializeHotel);

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
  const price = getHotelPrice(hotel.name, size);
  if (price === 0) {
    throw new GameError(
      'No price bracket found - check SharePrices configuration',
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  return price;
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

// Return a map of playerId to number of shares held for the given hotel
export const getStockHolders = (hotel: Hotel) =>
  hotel.shares
    .filter((share) => share.location !== 'bank')
    .reduce((acc, share) => {
      const playerId = share.location;
      acc.set(playerId, (acc.get(playerId) || 0) + 1);
      return acc;
    }, new Map());

export const getAvailableHotelNames = (board: BoardTile[]) =>
  HOTEL_NAMES.filter((hotel) => hotelTiles(hotel, board).length > 0);

export const canBuyShares = (money: number, hotels: Hotel[], board: BoardTile[]) => {
  const availableHotels = hotels.filter((hotel) =>
    hotelTiles(hotel.name, board).length > 0 &&
    hotel.shares.some((share) => share.location === 'bank')
  );
  const lowestSharePrice = Math.min(...availableHotels.map((hotel) => sharePrice(hotel, board)));
  // They can buy at least one share
  return money >= lowestSharePrice;
};
