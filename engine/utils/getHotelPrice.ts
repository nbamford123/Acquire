import { HOTEL_CONFIG, type HOTEL_NAME, SharePrices } from '../types/index.ts';

export const getHotelPrice = (hotel: HOTEL_NAME, size: number) => {
  const prices = SharePrices[HOTEL_CONFIG[hotel]];
  for (const [bracket, price] of Object.entries(prices)) {
    if (size <= Number(bracket)) {
      return price;
    }
  }
  return 0;
};
