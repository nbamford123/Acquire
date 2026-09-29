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

export async function savePlayerActions(actions: PlayerAction[], gameId: string) {
  await kv.set(['actions', gameId], actions);
}

export async function getPlayerActions(gameId: string): Promise<PlayerAction[]> {
  const actions: PlayerAction[] = [];
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

export async function deleteAllData() {
  const iter = kv.list({ prefix: [] });
  for await (const entry of iter) {
    await kv.delete(entry.key);
  }
}
