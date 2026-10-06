import type { GameState, PlayerAction } from '@acquire/engine/types';

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

export async function getGameState(gameId: string): Promise<GameState | null> {
  const result = await kv.get<GameState>(['games', gameId]);
  return result.value;
}

// The state along with its versionstamp, which saveMove checks
export async function getGameEntry(gameId: string) {
  return await kv.get<GameState>(['games', gameId]);
}

// Saves the state and appends the move's actions in one commit. It fails, returning false, if the
// game changed since it was read at versionstamp, so two moves can't overwrite each other. Each
// action is its own entry, keyed by its position in the log, so a long game doesn't run into the KV
// value size limit. start is the number of actions already saved.
export async function saveMove(
  state: GameState,
  versionstamp: string,
  start: number,
  actions: PlayerAction[],
): Promise<boolean> {
  const key = ['games', state.gameId];
  const operation = kv.atomic().check({ key, versionstamp }).set(key, state);
  actions.forEach((action, i) => operation.set(['actions', state.gameId, start + i], action));
  const result = await operation.commit();
  return result.ok;
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
