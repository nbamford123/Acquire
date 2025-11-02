import { HOTEL_CONFIG, type HOTEL_NAME, SharePrices } from '../types/index.ts';

type PriceBracket = { price: number; majority: number; minority: number };

/**
 * Get the price bracket for a hotel at a given size.
 *
 * Backwards compatible: callers can pass an optional `prices` map to make the
 * function easier to test. If not provided it uses the canonical
 * `SharePrices[HOTEL_CONFIG[hotel]]`.
 *
 * This implementation normalizes the incoming prices to a Map<number, PriceBracket>
 * and iterates numeric brackets in ascending order to avoid relying on object
 * key ordering semantics.
 */
export const getHotelPrice = (
  hotel: HOTEL_NAME,
  size: number,
  prices?: Record<number | string, PriceBracket> | Map<number, PriceBracket>,
): PriceBracket => {
  const raw = prices ?? SharePrices[HOTEL_CONFIG[hotel]];

  // Normalize to Map<number, PriceBracket>
  const map: Map<number, PriceBracket> = raw instanceof Map ? raw : new Map(
    Object.entries(raw || {}).map(([k, v]) => [Number(k), v as PriceBracket] as const),
  );

  // Sort numeric brackets to ensure deterministic ordering
  const brackets = Array.from(map.keys()).sort((a, b) => a - b);
  for (const maxSize of brackets) {
    const bracket = map.get(maxSize)!;
    if (size <= maxSize) return bracket;
  }

  // No matching bracket found
  return { price: 0, majority: 0, minority: 0 };
};
