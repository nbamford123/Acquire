import { roundUpToNearestHundred } from '../utils/index.ts';

// playerStockCounts is assumed to be sorted in descending order
// returns an array of payouts indexed by player id
export const calculateShareholderPayouts = (
  majorityBonus: number,
  minorityBonus: number,
  playerStockCounts: { stockCount: number; playerId: number }[],
) => {
  const payouts: Record<number, number> = {};

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
      payouts[playerId] = perPlayer;
    });
  } else if (stockGroups[0].length > 1) {
    // Tie for majority - combine and split majority + minority among tied players
    const totalBonus = majorityBonus + minorityBonus;
    const perPlayer = roundUpToNearestHundred(totalBonus / stockGroups[0].length);
    stockGroups[0].forEach(({ playerId }) => {
      payouts[playerId] = perPlayer;
    });
    // No minority bonus paid to anyone else
  } else {
    // No tie for majority - single majority winner
    payouts[stockGroups[0][0].playerId] = majorityBonus;

    if (stockGroups.length > 1) {
      // Handle minority shareholders
      if (stockGroups[1].length > 1) {
        // Tie for minority - split minority bonus
        const perPlayer = roundUpToNearestHundred(minorityBonus / stockGroups[1].length);
        stockGroups[1].forEach(({ playerId }) => {
          payouts[playerId] = perPlayer;
        });
      } else {
        // Single minority winner
        payouts[stockGroups[1][0].playerId] = minorityBonus;
      }
    }
  }

  return payouts;
};
