export const getStockholderMap = (
  stockholderMap: Map<number, number>,
): { playerId: number; stockCount: number }[] =>
  Array.from(stockholderMap.entries())
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([playerId, stockCount]) => ({ playerId, stockCount }));
