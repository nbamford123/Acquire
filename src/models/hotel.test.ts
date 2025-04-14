import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { Hotel, Hotels } from "./Hotel.ts";
import { Tile } from "./Tile.ts";

Deno.test("Hotel - initialization", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Basic properties
  assertEquals(hotel.name, "Worldwide");
  assertEquals(hotel.type, "economy");
  assertEquals(hotel.tiles.length, 0);
  assertEquals(hotel.shares.length, 25);
  assertEquals(hotel.remainingShares, 25);
  assertEquals(hotel.safe, false);
});

Deno.test("Hotel - sharePrice calculations", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Starting price for a 0-tile hotel
  assertEquals(hotel.sharePrice, 200);

  // Add 3 tiles and check new price
  const tile1 = new Tile(0, 0);
  const tile2 = new Tile(0, 1);
  const tile3 = new Tile(0, 2);

  // Move tiles to board first
  tile1.moveToBoard();
  tile2.moveToBoard();
  tile3.moveToBoard();

  hotel.addTile(tile1);
  hotel.addTile(tile2);
  hotel.addTile(tile3);

  assertEquals(hotel.sharePrice, 300);

  // Add more tiles to hit next price bracket
  for (let i = 3; i < 5; i++) {
    const tile = new Tile(0, i);
    tile.moveToBoard();
    hotel.addTile(tile);
  }

  assertEquals(hotel.sharePrice, 500);

  // Check different hotel types have different prices
  const luxuryHotel = new Hotel("Tower", "luxury");
  tile1.moveToBoard();
  luxuryHotel.addTile(tile1);
  assertNotEquals(luxuryHotel.sharePrice, hotel.sharePrice);
  assertEquals(luxuryHotel.sharePrice, 400); // Luxury starts at 400
});

Deno.test("Hotel - safety threshold", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Add 10 tiles (not safe yet)
  for (let i = 0; i < 10; i++) {
    const tile = new Tile(0, i);
    tile.moveToBoard();
    hotel.addTile(tile);
  }

  assertEquals(hotel.safe, false);

  // Add 1 more tile to reach safety
  const safeTile = new Tile(1, 0);
  safeTile.moveToBoard();
  hotel.addTile(safeTile);

  assertEquals(hotel.safe, true);
});

Deno.test("Hotel - allocate shares", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Allocate shares to a player
  const allocated = hotel.allocateShares("player1", 5);
  assertEquals(allocated, 5);
  assertEquals(hotel.remainingShares, 20);
  assertEquals(hotel.getPlayerShareCount("player1"), 5);

  // Try to allocate more than available
  const moreThanAvailable = hotel.allocateShares("player2", 30);
  assertEquals(moreThanAvailable, 20); // Only 20 remaining
  assertEquals(hotel.remainingShares, 0);
  assertEquals(hotel.getPlayerShareCount("player2"), 20);
});

Deno.test("Hotel - return shares", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Set up some allocated shares
  hotel.allocateShares("player1", 10);

  // Return some shares
  const returned = hotel.returnShares("player1", 3);
  assertEquals(returned, 3);
  assertEquals(hotel.getPlayerShareCount("player1"), 7);
  assertEquals(hotel.remainingShares, 18);

  // Try to return more than owned
  const tooMany = hotel.returnShares("player1", 10);
  assertEquals(tooMany, 7); // Only had 7 remaining
  assertEquals(hotel.getPlayerShareCount("player1"), 0);
  assertEquals(hotel.remainingShares, 25);
});

Deno.test("Hotel - add tile validation", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Tile not on board shouldn't be added
  const bagTile = new Tile(0, 0);
  const addResult = hotel.addTile(bagTile);
  assertEquals(addResult, false);
  assertEquals(hotel.tiles.length, 0);

  // Tile on board should be added
  const boardTile = new Tile(1, 1);
  boardTile.moveToBoard();
  const successResult = hotel.addTile(boardTile);
  assertEquals(successResult, true);
  assertEquals(hotel.tiles.length, 1);

  // Same tile shouldn't be added twice
  const duplicateResult = hotel.addTile(boardTile);
  assertEquals(duplicateResult, false);
  assertEquals(hotel.tiles.length, 1);
});

Deno.test("Hotel - merge with another hotel", () => {
  const acquirer = new Hotel("Imperial", "standard");
  const target = new Hotel("Festival", "standard");

  // Add tiles to both hotels
  for (let i = 0; i < 5; i++) {
    const acquirerTile = new Tile(0, i);
    acquirerTile.moveToBoard();
    acquirer.addTile(acquirerTile);

    const targetTile = new Tile(1, i);
    targetTile.moveToBoard();
    target.addTile(targetTile);
  }

  // Allocate some shares
  acquirer.allocateShares("player1", 3);
  target.allocateShares("player1", 4);

  // Perform the merger
  const mergeResult = acquirer.mergeWith(target);
  assertEquals(mergeResult, true);

  // Check merger results
  assertEquals(acquirer.tiles.length, 10);
  assertEquals(target.tiles.length, 0);
  assertEquals(acquirer.getPlayerShareCount("player1"), 3); // Unchanged
  assertEquals(target.getPlayerShareCount("player1"), 0); // Returned to bank
  assertEquals(target.remainingShares, 25); // All shares back in bank
});

Deno.test("Hotel - safe hotels cannot merge", () => {
  const acquirer = new Hotel("Imperial", "standard");
  const target = new Hotel("Festival", "standard");

  // Make acquirer safe (11+ tiles)
  for (let i = 0; i < 12; i++) {
    const tile = new Tile(0, i);
    tile.moveToBoard();
    acquirer.addTile(tile);
  }

  // Add a few tiles to target
  for (let i = 0; i < 3; i++) {
    const tile = new Tile(1, i);
    tile.moveToBoard();
    target.addTile(tile);
  }

  // Attempt merger (should fail because acquirer is safe)
  const mergeResult = acquirer.mergeWith(target);
  assertEquals(mergeResult, false);
  assertEquals(acquirer.tiles.length, 12);
  assertEquals(target.tiles.length, 3);
});

Deno.test("Hotel - serialization", () => {
  const hotel = new Hotel("Worldwide", "economy");

  // Add some tiles and shares
  for (let i = 0; i < 3; i++) {
    const tile = new Tile(0, i);
    tile.moveToBoard();
    hotel.addTile(tile);
  }
  hotel.allocateShares("player1", 5);

  // Serialize and check
  const serialized = hotel.serialize();
  assertEquals(serialized.name, "Worldwide");
  assertEquals(serialized.type, "economy");
  assertEquals(serialized.remainingShares, 20);
  assertEquals(serialized.safe, false);
  assertEquals(serialized.sharePrice, 300);
  assertEquals(serialized.tiles.length, 3);
});

Deno.test("Hotel - createHotels factory function", () => {
  const hotels = Hotels;

  // Should create all 7 hotels
  assertEquals(hotels.length, 7);

  // Check hotel types
  const economyHotels = hotels.filter((h) => h.type === "economy");
  const standardHotels = hotels.filter((h) => h.type === "standard");
  const luxuryHotels = hotels.filter((h) => h.type === "luxury");

  assertEquals(economyHotels.length, 2);
  assertEquals(standardHotels.length, 3);
  assertEquals(luxuryHotels.length, 2);

  // Each hotel should have its own shares
  hotels.forEach((hotel) => {
    assertEquals(hotel.shares.length, 25);
    assertEquals(hotel.remainingShares, 25);
  });
});
