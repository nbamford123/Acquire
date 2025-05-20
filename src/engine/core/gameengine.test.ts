import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { Game } from "./gameEngine.old.ts";
import type { ValidGameState } from "../types.ts";
Deno.test("Game tests", async (t) => {
  // Setup variables outside of test scope
  let game: Game;
  const players = ["cannon", "jamie", "reid", "brian", "pete"];

  // Use setup function instead of beforeEach
  function setup() {
    game = new Game(players[0]);
    for (const player of players.slice(1)) {
      game.addPlayer(player);
    }
  }

  // Test: adds players
  await t.step("adds players", () => {
    setup();
    const gameState = game.getGameState("cannon");
    assertEquals((gameState as ValidGameState).players, players);
  });

  // Test: has the owner set to the player who initialized the game
  await t.step(
    "has the owner set to the player who initialized the game",
    () => {
      setup();
      assertEquals(game.owner, players[0]);
    },
  );

  // Test: draws initial player tiles and sorts players on start game
  await t.step(
    "draws initial player tiles and sorts players on start game",
    () => {
      setup();
      game.startGame();
      const state = game.getGameState("cannon") as ValidGameState;

      // Using assertNotEquals instead of expect().not.toBeUndefined()
      assertNotEquals(state.startGameState, undefined);

      const cannonTile = state.startGameState.tiles["cannon"];
      assertEquals(cannonTile.location, "board");

      const jamieTile = state.startGameState.tiles["jamie"];
      assertEquals(jamieTile.location, "board");

      const reidTile = state.startGameState.tiles["reid"];
      assertEquals(reidTile.location, "board");

      const brianTile = state.startGameState.tiles["brian"];
      assertEquals(brianTile.location, "board");

      const peteTile = state.startGameState.tiles["pete"];
      assertEquals(peteTile.location, "board");

      // Sorting algorithm is tested elsewhere, possible this might fail if drawn tiles match initial positions
      assertNotEquals(state.players, players);
      assertEquals(state.turn, state.players[0]);

      // Kinda weak, but a visual check just in case
      console.log(state.startGameState);
    },
  );
});
