import { assertEquals } from "jsr:@std/assert";
import { expect } from "jsr:@std/expect";

import { CHARACTER_CODE_A, COLS, ROWS } from "@/config/gameConfig.ts";
import { TileManager } from "./TileManager.ts";

Deno.test("Has a 9x12 board of tiles", () => {
  const bag = new TileManager();
  assertEquals(bag.getAllTiles().length, ROWS * COLS);
});
Deno.test("Tiles are all in bag", () => {
  const bag = new TileManager();
  assertEquals(
    bag.getAllTiles().every((tile) => tile.location === "bag"),
    true,
  );
});
Deno.test("Tiles have appropriate label", () => {
  const bag = new TileManager();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      assertEquals(
        bag.getTileAt(row, col)?.label,
        `${row + 1}${String.fromCharCode(col + CHARACTER_CODE_A)}`,
      );
    }
  }
});
Deno.test("can draw random tiles", () => {
  const bag = new TileManager();
  const myTiles = bag.drawTiles("player1", 6);
  assertEquals(myTiles.length, 6);
  // Surely the first one won't be 0,0
  const position = [myTiles[0].row, myTiles[0].col];
  expect(position).not.toEqual([0, 0]);
});
Deno.test("has tiles assigned after draw", () => {
  const bag = new TileManager();
  const myTiles = bag.drawTiles("player1", 6);
  expect(myTiles.every((tile) => tile.location === "player1")).toBeTruthy();
  expect(
    bag.getAllTiles().filter((tile) => tile.location === "bag"),
  ).toHaveLength(ROWS * COLS - 6);
});
Deno.test("only returns available tiles when more requested", () => {
  const bag = new TileManager();
  bag.drawTiles("player1", 100);
  const myTiles = bag.drawTiles("player1", 10);
  expect(myTiles).toHaveLength(8);
});
Deno.test("Tiles can be played to board", () => {
  const manager = new TileManager();
  const drawnTiles = manager.drawTiles("player1", 3);
  const targetTile = drawnTiles[0];

  const success = manager.playTile(targetTile.row, targetTile.col, "player1");
  expect(success).toBeTruthy();

  const playedTile = manager.getTileAt(targetTile.row, targetTile.col);
  expect(playedTile?.location).toEqual("board");
});
Deno.test("Serializes visible tiles correctly", () => {
  const manager = new TileManager();
  manager.drawTiles("player1", 3);
  manager.drawTiles("player2", 3);

  // Player1 should only see their tiles, not player2's
  const visibleTiles = manager.serializeVisibleTiles("player1");
  expect(visibleTiles.length).toEqual(3);
  expect(visibleTiles.every((t) => t.location === "player1")).toBeTruthy();
});
Deno.test("Can find hotel for a tile", () => {
  const manager = new TileManager();
  const tile = manager.getTileAt(5, 5);
  tile?.moveToBoard();

  const mockHotels = [{
    name: "Worldwide",
    tiles: [{ row: 5, col: 5, location: "board" }],
  }];

  expect(manager.findHotelForTile(5, 5, mockHotels)).toEqual("Worldwide");
  expect(manager.findHotelForTile(0, 0, mockHotels)).toBeNull();
});
