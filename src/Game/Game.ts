import { Hotel, Hotels } from '../Hotel/Hotel';
import { Player } from '../Player/Player';
import { Tile, Tiles } from '../Tile/Tile';
import { sortTiles } from '../utils';

import type { GameState, IPlayerShares, StartGameState } from '../types';

export class Game {
  players: Array<Player> = [];
  tiles = new Tiles();
  hotels = Hotels;

  gameActive = false;

  // Get game state, but only what this player has access to
  gameState = (playerName: string): GameState => {
    // Make sure this is a valid player
    const player = this.players.find((p) => p.name === playerName);
    if (!player) return { error: 'Player not found' };
    return {
      tiles: this.tiles.serialize(player.name),
      hotels: this.hotels.map((hotel) => hotel.serialize()),
      players: this.players.map((p) => p.name),
      player: {
        money: player.money,
        shares: this.hotels.reduce((stocks, hotel) => {
          const shares = hotel.shares.filter(
            (share) => share.location === player.name,
          );
          if (shares.length) return { ...stocks, [hotel.name]: shares.length };
          else return stocks;
        }, {} as IPlayerShares),
      },
    };
  };

  addPlayer = (name: string) => {
    this.players.push(new Player(name));
  };

  drawAndPlayInitialTiles = (): StartGameState => {
    const startGameState: StartGameState = { playerOrder: [], tiles: {} };
    for (const player of this.players) {
      const tile = this.tiles.drawTiles(player.name, 1)[0];
      startGameState.tiles[player.name] = {
        col: tile.col,
        row: tile.row,
        location: 'board',
      };
      tile.play();
    }
    this.players = this.players.sort((p1, p2) => {
      const p1Pos = startGameState.tiles[p1.name];
      const p2Pos = startGameState.tiles[p2.name];
      return sortTiles(p1Pos, p2Pos);
    });
    startGameState.playerOrder = this.players.map((p) => p.name);
    return startGameState;
  };

  startGame = () => {
    this.gameActive = true;
  };
}
// startHotel(player: string, hotel: string)
// tiles: Tiles = new Tiles();
// playTile(player: string, tile: Tile)
// Won't we know the current player so we don't need the name?
// merge(player: string, hotel: Hotel, mergingHotel: Hotel)
// get availableHotels(): Array<Hotel>
// buyStocks(player: string, hotel: Hotel(or string), stocks: number)
// drawTiles(player, tile: number)
// ALGO
// player plays tile(x, y)
// 1) x,y touches hotel: if more than 1, doMerge
//  else add to hotel
// 2) x,y touches other tile on board that's not hotel, do createHotel (if hotels available)
// otherwise, play tile part is over
// if hotels available and unclaimed multiple tiles, also trigger createHotel
// buy stonks
// Find/remove dead tiles-- maybe just mark them and wait until that player's turn?
// Can game be ended? Must game be ended?
// Game Loop:
// while (notdone)
//  for player in players
//    player.playtile (or pass and draw?)
//     start hotel or merge, if possible
//     buy stocks
//     find/remove dead tiles
//     test for game end
//     ability to cancel game? Only person who started game? Can players leave?
//  calculate score, declare winner
