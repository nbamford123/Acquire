import { getStockHolders, hotelTiles, majorityMinorityValue } from '../domain/index.ts';
import { getStockholderMap, roundUpToNearestHundred } from '../utils/index.ts';
import type { BoardTile, Hotel } from '../types/index.ts';

// playerStockCounts is assumed to be sorted in descending order
// returns an array of payouts indexed by player id
export const calculateShareholderPayouts = (
  hotel: Hotel,
  gameBoard: BoardTile[],
): [Map<number, number>, string[]] => {
  // pay the majority and minority shareholders
  const stockholders = getStockHolders(hotel);
  const playerStockCounts = getStockholderMap(stockholders);
  const mergedSize = hotelTiles(hotel.name, gameBoard).length;
  const [majorityBonus, minorityBonus] = majorityMinorityValue(hotel, gameBoard);

  const payouts: Map<number, number> = new Map();
  let payoutResult = '';

  // Handle case where there are no shareholders (all shares in bank)
  if (playerStockCounts.length === 0) {
    payoutResult = 'No shareholders - all shares held by bank';
    const actions = [
      `Hotel ${hotel.name} with ${mergedSize} tiles has majority bonus of ${majorityBonus} and minority bonus of ${minorityBonus}`,
      payoutResult,
    ];
    return [payouts, actions];
  }

  // Group players by stock count to handle ties
  const stockGroups = [];
  let currentGroup = [playerStockCounts[0]];

  for (let i = 1; i < playerStockCounts.length; i++) {
    if (playerStockCounts[i].stockCount === currentGroup[0].stockCount) {
      currentGroup.push(playerStockCounts[i]);
    } else {
      stockGroups.push(currentGroup);
      currentGroup = [playerStockCounts[i]];
    }
  }
  stockGroups.push(currentGroup);

  if (stockGroups.length === 1) {
    // Everyone tied - split both bonuses among all players
    const totalBonus = majorityBonus + minorityBonus;
    const perPlayer = roundUpToNearestHundred(totalBonus / stockGroups[0].length);
    stockGroups[0].forEach(({ playerId }) => {
      payouts.set(playerId, perPlayer);
    });
    payoutResult = `Majority plus minority ${
      stockGroups[0].length === 1 ? 'single shareholder' : 'split between tied shareholders'
    }`;
  } else if (stockGroups[0].length > 1) {
    // Tie for majority - combine and split majority + minority among tied players
    const totalBonus = majorityBonus + minorityBonus;
    const perPlayer = roundUpToNearestHundred(totalBonus / stockGroups[0].length);
    stockGroups[0].forEach(({ playerId }) => {
      payouts.set(playerId, perPlayer);
    });
    payoutResult = 'Majority plus minority split between tied majority shareholders';
    // No minority bonus paid to anyone else
  } else {
    // No tie for majority - single majority winner
    payouts.set(stockGroups[0][0].playerId, majorityBonus);
    payoutResult = 'Majority bonus paid to single majority shareholder';
    if (stockGroups.length > 1) {
      // Handle minority shareholders
      if (stockGroups[1].length > 1) {
        // Tie for minority - split minority bonus
        const perPlayer = roundUpToNearestHundred(minorityBonus / stockGroups[1].length);
        stockGroups[1].forEach(({ playerId }) => {
          payouts.set(playerId, perPlayer);
        });
        payoutResult = 'Minority bonus split between tied shareholders';
      } else {
        // Single minority winner
        payouts.set(stockGroups[1][0].playerId, minorityBonus);
        payoutResult = 'Minority bonus paid to single minority shareholder';
      }
    }
  }

  const actions = [
    `Hotel ${hotel.name} with ${mergedSize} tiles has majority bonus of ${majorityBonus} and minority bonus of ${minorityBonus}`,
    payoutResult,
  ];
  return [payouts, actions];
};
