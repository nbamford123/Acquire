import type { GameState, PlayerAction, PlayerStats } from '@acquire/engine/types';

// KV_PATH pins a local database file; leave unset on Deno Deploy to use hosted KV
const kv = await Deno.openKv(Deno.env.get('KV_PATH'));

export async function getAllGames(): Promise<GameState[]> {
  const games: GameState[] = [];
  const iter = kv.list<GameState>({ prefix: ['games'] });

  for await (const entry of iter) {
    games.push(entry.value);
  }
  return games;
}

export async function saveGameState(state: GameState) {
  await kv.set(['games', state.gameId], state);
}

// Saves a new game, returning false if its id is already taken
export async function createGame(state: GameState): Promise<boolean> {
  const key = ['games', state.gameId];
  const result = await kv.atomic().check({ key, versionstamp: null }).set(key, state).commit();
  return result.ok;
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  const result = await kv.get<GameState>(['games', gameId]);
  return result.value;
}

// The state along with its versionstamp, which saveMove checks
export async function getGameEntry(gameId: string) {
  return await kv.get<GameState>(['games', gameId]);
}

// How one player finished a game, which the leaderboard adds up
export interface GameResult {
  name: string;
  money: number;
  won: boolean;
}

// Each player's totals are counters, under ['stats', name, counter], so a finished game adds to
// them without reading them first
const STAT_COUNTERS = ['gamesPlayed', 'gamesWon', 'earnings'] as const;

// Saves the state and appends the move's actions in one commit. It fails, returning false, if the
// game changed since it was read at versionstamp, so two moves can't overwrite each other. Each
// action is its own entry, keyed by its position in the log, so a long game doesn't run into the KV
// value size limit. start is the number of actions already saved. results, for the move that ends
// the game, go to the leaderboard in the same commit, so a game counts exactly once.
export async function saveMove(
  state: GameState,
  versionstamp: string,
  start: number,
  actions: PlayerAction[],
  results: GameResult[] = [],
): Promise<boolean> {
  const key = ['games', state.gameId];
  const operation = kv.atomic().check({ key, versionstamp }).set(key, state);
  actions.forEach((action, i) => operation.set(['actions', state.gameId, start + i], action));
  for (const { name, money, won } of results) {
    operation
      .sum(['stats', name, 'gamesPlayed'], 1n)
      .sum(['stats', name, 'gamesWon'], won ? 1n : 0n)
      .sum(['stats', name, 'earnings'], BigInt(Math.max(money, 0)));
  }
  const result = await operation.commit();
  return result.ok;
}

// Every player who has finished a game, most earnings first, then most wins
export async function getLeaderboard(): Promise<PlayerStats[]> {
  const players = new Map<string, PlayerStats>();
  for await (const entry of kv.list<Deno.KvU64>({ prefix: ['stats'] })) {
    const [, name, counter] = entry.key as [string, string, typeof STAT_COUNTERS[number]];
    if (!STAT_COUNTERS.includes(counter)) continue;
    const stats = players.get(name) ?? { name, gamesPlayed: 0, gamesWon: 0, earnings: 0 };
    stats[counter] = Number(entry.value.value);
    players.set(name, stats);
  }
  return [...players.values()].sort((a, b) =>
    b.earnings - a.earnings || b.gamesWon - a.gamesWon || a.name.localeCompare(b.name)
  );
}

export async function getPlayerActions(gameId: string): Promise<PlayerAction[]> {
  const actions: PlayerAction[] = [];
  // Numeric positions list in order
  const iter = kv.list<PlayerAction>({ prefix: ['actions', gameId] });

  for await (const entry of iter) {
    actions.push(entry.value);
  }

  return actions;
}

export async function deleteGame(gameId: string) {
  // Delete game state
  await kv.delete(['games', gameId]);

  // Delete all actions for this game
  const iter = kv.list({ prefix: ['actions', gameId] });
  for await (const entry of iter) {
    await kv.delete(entry.key);
  }
}

// Deletes every game last updated before cutoff (a timestamp), returning their ids
export async function deleteGamesUpdatedBefore(cutoff: number): Promise<string[]> {
  const stale = (await getAllGames()).filter((game) => game.lastUpdated < cutoff);
  for (const game of stale) {
    await deleteGame(game.gameId);
  }
  return stale.map((game) => game.gameId);
}

export async function deleteAllData() {
  const iter = kv.list({ prefix: [] });
  for await (const entry of iter) {
    await kv.delete(entry.key);
  }
}
