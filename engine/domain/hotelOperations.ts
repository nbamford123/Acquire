import { getHotelByName } from './assertions.ts';
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

const findCurrentHotelPrice = (hotel: HOTEL_NAME, tiles: BoardTile[]) => {
  const size = hotelTiles(hotel, tiles).length;
  const price = getHotelPrice(hotel, size);
  if (price === 0) {
    throw new GameError(
      'No price bracket found - check SharePrices configuration',
      GameErrorCodes.GAME_PROCESSING_ERROR,
    );
  }
  return price;
};

export const sharePrice = (hotel: HOTEL_NAME, tiles: BoardTile[]): number =>
  findCurrentHotelPrice(hotel, tiles).price;

export const majorityMinorityValue = (hotel: Hotel, tiles: BoardTile[]) => {
  const price = findCurrentHotelPrice(hotel.name, tiles);
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

export const getHotelsByNames = (hotels: Hotel[], names: HOTEL_NAME[]): Hotel[] =>
  names.map((name) => getHotelByName(hotels, name));

// Return a map of playerId to number of shares held for the given hotel
export const getStockHolders = (hotel: Hotel): Map<number, number> =>
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

export const resolveShares = (
  playerId: number,
  board: BoardTile[],
  survivor: Hotel,
  merged: Hotel,
  shares: { sell: number; trade: number } | undefined,
): { survivorShares: Share[]; mergedShares: Share[]; income: number } => {
  let survivorShares = survivor.shares;
  let mergedShares = merged.shares;

  // Trade shares
  if (shares && shares.trade) {
    const tradedShares = shares.trade / 2;
    survivorShares = assignSharesToPlayer(survivorShares, playerId, tradedShares);
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.trade);
  }

  // Sell shares
  let income = 0;
  if (shares && shares.sell) {
    const shareValue = sharePrice(merged.name, board) * shares.sell;
    income = shareValue;
    mergedShares = returnSharesToBank(mergedShares, playerId, shares.sell);
  }
  return { survivorShares, mergedShares, income };
};
