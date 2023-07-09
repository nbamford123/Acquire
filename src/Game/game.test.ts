import { test, expect } from '@jest/globals';

import { Game } from './Game';
import type { GameState } from '../types';

let game: Game;
const players = ['cannon', 'jamie', 'reid', 'brian', 'pete'];

beforeEach(() => {
  game = new Game();
  for (const player of players) {
    game.addPlayer(player);
  }
});

test('adds players', () => {
  const gameState = game.gameState('cannon');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  expect(gameState.players).toEqual(players);
});

test('draws initial player tiles and sorts players', () => {
  const initialGameState = game.drawAndPlayInitialTiles();
  const cannonTile = initialGameState.tiles['cannon'];
  expect(cannonTile.location).toEqual('board');
  const jamieTile = initialGameState.tiles['jamie'];
  expect(jamieTile.location).toEqual('board');
  const reidTile = initialGameState.tiles['reid'];
  expect(reidTile.location).toEqual('board');
  const brianTile = initialGameState.tiles['brian'];
  expect(brianTile.location).toEqual('board');
  const peteTile = initialGameState.tiles['pete'];
  expect(peteTile.location).toEqual('board');
  // Sorting algorithm is tested elsewhere, possible this might fail if drawn tiles match initial positions
  expect(initialGameState.playerOrder).not.toEqual(players);
  // Kinda weak, but a visual check just in case
  console.log(initialGameState);
});
