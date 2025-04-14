import { assertEquals } from "jsr:@std/assert";

import type { Tile } from '@/models/Tile.ts';

import { sortTiles } from "./utils.ts";

Deno.test("sorts correctly when columns differ", () => {
  assertEquals(
    sortTiles(
      { row: 0, col: 0, location: "" } as Tile,
      { row: 0, col: 1, location: "" } as Tile,
    ),
    -1,
  );
  assertEquals(
    sortTiles(
      { row: 0, col: 12, location: "" } as Tile,
      { row: 0, col: 10, location: "" } as Tile,
    ),
    1,
  );
});
Deno.test("sorts correctly when columns are the same, but rows differ", () => {
  assertEquals(
    sortTiles(
      { row: 0, col: 0, location: "" } as Tile,
      { row: 1, col: 0, location: "" } as Tile,
    ),
    -1,
  );
  assertEquals(
    sortTiles(
      { row: 7, col: 12, location: "" } as Tile,
      { row: 6, col: 12, location: "" } as Tile,
    ),
    1,
  );
});
