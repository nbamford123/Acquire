import { Hotel, type HOTEL_NAME, Hotels } from "@/models/Hotel.ts";
import { Player } from "@/models/Player.ts";
import { TileManager } from "@/models/TileManager.ts";
import { cmpTiles } from "@/utils/utils.ts";
import { MAX_PLAYERS } from "@/config/gameConfig.ts";
import type { GameStateSnapshot } from "../types/gameState.ts";
import type { GameAction } from "../actions/actions.ts";

export const processGameAction = (state: GameStateSnapshot, action: GameAction): GameStateSnapshot => {
  if (action.action === "ADD_PLAYER") {
    // I do think we want a reducer here-- it just makes sense, it's going to take the game
    // state and return a new one
    if (state.currentPhase !== "WAITING_FOR_PLAYERS")
      // game state is going to have to allow for error returns
      return {};
    if (state.players.length >= MAX_PLAYERS)
      return {}
    if (state.players.find(p => p.name === action.player))
      return {};
    
    state.players.push({name: action.player, money: })
  }
}

export class Game {
  private gameId: string;
  private currentState: GameState = GameState.WAITING_FOR_PLAYERS;
  private tileManager: TileManager;
  private hotels: Hotel[] = Hotels;
  private players: Map<string, Player> = new Map();
  private currentPlayerIndex = 0;
  private lastUpdated: number = Date.now();
  private pendingMerger: {
    acquirer: Hotel;
    targets: Hotel[];
  } | null = null;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.tileManager = new TileManager();
  }

  /**
   * Adds a player to the game
   * @param playerName The name of the player to add
   * @returns Success indicator
   */
  public addPlayer(playerName: string): boolean {
    if (this.currentState !== GameState.WAITING_FOR_PLAYERS) {
      return false;
    }

    if (this.players.has(playerName)) {
      return false;
    }

    // Create a new player with starting money
    const player = new Player(playerName, 6000); // Starting money amount
    this.players.set(playerName, player);

    return true;
  }

  /**
   * Starts the game
   * @returns Success indicator
   */
  public startGame(): boolean {
    if (this.currentState !== GameState.WAITING_FOR_PLAYERS) {
      return false;
    }

    if (this.players.size < 2 || this.players.size > 6) {
      return false; // Invalid player count
    }

    // Deal initial tile to each player to determine order and place on board
    for (const [name, player] of this.players) {
      const firstTile = this.tileManager.drawTiles(name, 1)[0];
      player.firstTile = firstTile;
      this.tileManager.playTile(firstTile.row, firstTile.col, name);
    }
    this.players = new Map(
      [...this.players].sort(([_p1Name, player1], [_p2Name, player2]) =>
        cmpTiles(player1.firstTile, player2.firstTile)
      ),
    );

    // Set initial game state
    this.currentState = GameState.PLAY_TILE;
    this.currentPlayerIndex = 0;
    this.lastUpdated = Date.now();

    return true;
  }

  /**
   * Current player plays a tile
   * @param playerName Player making the move
   * @param row Tile row
   * @param col Tile column
   * @returns Success indicator
   */
  public playTile(playerName: string, row: number, col: number): boolean {
    // Validate turn and game state
    if (
      this.currentState !== GameState.PLAY_TILE ||
      this.getCurrentPlayer() !== playerName
    ) {
      return false;
    }

    // Try to play the tile
    const success = this.tileManager.playTile(row, col, playerName);
    if (!success) {
      return false;
    }

    this.lastUpdated = Date.now();

    // Check for adjacent hotels and unincorporated tiles
    const adjacentResult = this.checkAdjacentTilesAndHotels(row, col);

    if (adjacentResult.foundingPossible) {
      // Need to found a hotel
      this.currentState = GameState.FOUND_HOTEL;
      return true;
    }

    if (adjacentResult.mergerRequired) {
      // Need to resolve a merger
      this.pendingMerger = adjacentResult.mergerInfo!;
      this.currentState = GameState.RESOLVE_MERGER;
      return true;
    }

    // Move to buy shares phase
    this.currentState = GameState.BUY_SHARES;
    return true;
  }

  /**
   * Found a new hotel
   * @param playerName Player founding the hotel
   * @param hotelName Hotel to found
   * @returns Success indicator
   */
  public foundHotel(playerName: string, hotelName: HOTEL_NAME): boolean {
    if (
      this.currentState !== GameState.FOUND_HOTEL ||
      this.getCurrentPlayer() !== playerName
    ) {
      return false;
    }

    // Find the hotel by name
    const hotel = this.hotels.find((h) => h.name === hotelName);
    if (!hotel || hotel.tiles.length > 0) {
      return false; // Hotel not available
    }

    // Add connected unincorporated tiles to the hotel
    // This would need to find all adjacent unincorporated tiles and add them
    const success = this.incorporateAdjacentTiles(hotel);
    if (!success) {
      return false;
    }

    // Give the founding player a free share if available
    if (hotel.remainingShares > 0) {
      hotel.allocateShares(playerName, 1);
    }

    this.lastUpdated = Date.now();
    this.currentState = GameState.BUY_SHARES;
    return true;
  }

  /**
   * Resolve a merger by choosing the acquiring hotel
   * @param playerName Player making the decision
   * @param acquiringHotelName Name of hotel that will acquire others
   * @returns Success indicator
   */
  public resolveMerger(
    playerName: string,
    acquiringHotelName: HOTEL_NAME,
  ): boolean {
    if (
      this.currentState !== GameState.RESOLVE_MERGER ||
      this.getCurrentPlayer() !== playerName ||
      !this.pendingMerger
    ) {
      return false;
    }

    // Find the hotel by name
    const acquiringHotel = this.hotels.find((h) =>
      h.name === acquiringHotelName
    );
    if (!acquiringHotel) {
      return false;
    }

    // Validate this is one of the possible acquiring hotels
    if (
      acquiringHotel !== this.pendingMerger.acquirer &&
      !this.pendingMerger.targets.includes(acquiringHotel)
    ) {
      return false;
    }

    // Determine which hotels are being acquired
    let hotelsToAcquire: Hotel[];
    if (acquiringHotel === this.pendingMerger.acquirer) {
      hotelsToAcquire = this.pendingMerger.targets;
    } else {
      hotelsToAcquire = [this.pendingMerger.acquirer];
      hotelsToAcquire.push(
        ...this.pendingMerger.targets.filter((h) => h !== acquiringHotel),
      );
    }

    // Process the merger
    this.processMerger(acquiringHotel, hotelsToAcquire);

    this.lastUpdated = Date.now();
    this.currentState = GameState.BUY_SHARES;
    this.pendingMerger = null;
    return true;
  }

  /**
   * Buy shares for the current player
   * @param playerName Player buying shares
   * @param purchases Map of hotel names to number of shares to buy
   * @returns Success indicator
   */
  public buyShares(
    playerName: string,
    purchases: Record<HOTEL_NAME, number>,
  ): boolean {
    if (
      this.currentState !== GameState.BUY_SHARES ||
      this.getCurrentPlayer() !== playerName
    ) {
      return false;
    }

    const player = this.players.get(playerName);
    if (!player) {
      return false;
    }

    // Calculate total cost and validate purchases
    let totalCost = 0;
    let totalShares = 0;
    const transactions: Array<{ hotel: Hotel; amount: number }> = [];

    // Validate the purchase is legal
    for (const [hotelName, amount] of Object.entries(purchases)) {
      if (amount <= 0) continue;

      const hotel = this.hotels.find((h) => h.name === hotelName);
      if (!hotel || hotel.tiles.length === 0) {
        return false; // Cannot buy shares of non-existent hotels
      }

      if (hotel.remainingShares < amount) {
        return false; // Not enough shares available
      }

      totalCost += hotel.sharePrice * amount;
      totalShares += amount;
      transactions.push({ hotel, amount });
    }

    // Verify player has enough money and not buying too many shares
    if (totalCost > player.money || totalShares > 3) {
      return false;
    }

    // Process the purchases
    for (const { hotel, amount } of transactions) {
      hotel.allocateShares(playerName, amount);
      player.money -= hotel.sharePrice * amount;
    }

    // End turn and advance to next player
    this.advanceTurn();
    return true;
  }

  /**
   * Skip buying shares and end turn
   * @param playerName Player ending their turn
   * @returns Success indicator
   */
  public endTurn(playerName: string): boolean {
    if (
      this.currentState !== GameState.BUY_SHARES ||
      this.getCurrentPlayer() !== playerName
    ) {
      return false;
    }

    // End turn and advance to next player
    this.advanceTurn();
    return true;
  }

  /**
   * Get current game state for client
   * @param playerName Optional player name to filter visible tiles
   * @returns Game state snapshot
   */
  public getGameState(playerName?: string): GameStateSnapshot {
    const visibleTiles = playerName
      ? this.tileManager.serializeVisibleTiles(playerName)
      : this.tileManager.getAllTiles().map((t) => t.serialize());

    return {
      gameId: this.gameId,
      currentState: this.currentState,
      currentTurn: this.getCurrentPlayer(),
      lastUpdated: this.lastUpdated,
      players: Array.from(this.players.entries()).map(([name, player]) => ({
        name,
        money: player.money,
        shares: this.getPlayerShareCounts(name),
      })),
      hotels: this.hotels.map((hotel) => ({
        name: hotel.name,
        size: hotel.tiles.length,
        safe: hotel.safe,
        sharePrice: hotel.sharePrice,
        remainingShares: hotel.remainingShares,
      })),
      tiles: visibleTiles,
      pendingDecision: this.getPendingDecision(),
      lastAction: {
        player: this.getCurrentPlayer(),
        action: this.getLastActionDescription(),
        timestamp: this.lastUpdated,
      },
    };
  }

  // Private helper methods

  private getCurrentPlayer(): string {
    return this.players.get([this.currentPlayerIndex];
  }

  private advanceTurn(): void {
    // Handle tile drawing for next player
    const currentPlayer = this.getCurrentPlayer();
    const playerTiles = this.tileManager.getPlayerTiles(currentPlayer);

    if (playerTiles.length < 6) {
      this.tileManager.drawTiles(currentPlayer, 6 - playerTiles.length);
    }

    // Advance to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) %
      this.playerOrder.length;
    this.currentState = GameState.PLAY_TILE;
    this.lastUpdated = Date.now();

    // Check for game end conditions
    this.checkGameEndConditions();
  }

  private shufflePlayerOrder(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.playerOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playerOrder[i], this.playerOrder[j]] = [
        this.playerOrder[j],
        this.playerOrder[i],
      ];
    }
  }

  private checkAdjacentTilesAndHotels(row: number, col: number): {
    foundingPossible: boolean;
    mergerRequired: boolean;
    mergerInfo?: {
      acquirer: Hotel;
      targets: Hotel[];
    };
  } {
    // This would need to implement the logic to:
    // 1. Check for adjacent unincorporated tiles
    // 2. Check for adjacent hotels
    // 3. Determine if hotel founding is possible
    // 4. Determine if a merger is required

    // Placeholder implementation
    return {
      foundingPossible: false,
      mergerRequired: false,
    };
  }

  private incorporateAdjacentTiles(hotel: Hotel): boolean {
    // Implementation would find and add all adjacent unincorporated tiles to hotel
    return true;
  }

  private processMerger(acquirer: Hotel, targets: Hotel[]): void {
    // Implementation would handle:
    // 1. Paying shareholder bonuses
    // 2. Transferring tiles to acquiring hotel
    // 3. Returning shares to bank
  }

  private getPlayerShareCounts(playerName: string): Record<HOTEL_NAME, number> {
    const result: Record<string, number> = {};
    for (const hotel of this.hotels) {
      result[hotel.name] = hotel.getPlayerShareCount(playerName);
    }
    return result as Record<HOTEL_NAME, number>;
  }

  private getPendingDecision():
    | GameStateSnapshot["pendingDecision"]
    | undefined {
    if (this.currentState === GameState.FOUND_HOTEL) {
      return {
        type: "foundHotel",
        options: this.getAvailableHotels().map((h) => h.name),
      };
    }

    if (this.currentState === GameState.RESOLVE_MERGER && this.pendingMerger) {
      return {
        type: "resolveMerger",
        options: [
          this.pendingMerger.acquirer.name,
          ...this.pendingMerger.targets.map((h) => h.name),
        ],
      };
    }

    return undefined;
  }

  private getAvailableHotels(): Hotel[] {
    return this.hotels.filter((hotel) => hotel.tiles.length === 0);
  }

  private getLastActionDescription(): string {
    switch (this.currentState) {
      case GameState.PLAY_TILE:
        return "started turn";
      case GameState.FOUND_HOTEL:
        return "needs to found a hotel";
      case GameState.RESOLVE_MERGER:
        return "needs to resolve a merger";
      case GameState.BUY_SHARES:
        return "is buying shares";
      case GameState.GAME_OVER:
        return "game ended";
      default:
        return "";
    }
  }

  private checkGameEndConditions(): void {
    // Check for game end conditions:
    // 1. All hotels are safe (41+ tiles)
    // 2. One hotel has 41+ tiles
    // 3. No more playable tiles

    const allSafeHotels = this.hotels.filter((h) => h.tiles.length > 0).every(
      (h) => h.safe,
    );
    const anyLargeHotel = this.hotels.some((h) => h.tiles.length >= 41);
    const tilesInBag =
      this.tileManager.getAllTiles().filter((t) => t.location === "bag").length;
    const tilesInHands = this.playerOrder.reduce(
      (sum, player) => sum + this.tileManager.getPlayerTiles(player).length,
      0,
    );

    if (
      allSafeHotels || anyLargeHotel || (tilesInBag === 0 && tilesInHands === 0)
    ) {
      this.currentState = GameState.GAME_OVER;
      // Calculate final scores and determine winner
      this.calculateFinalScores();
    }
  }

  private calculateFinalScores(): void {
    // Implementation would calculate:
    // 1. Share values
    // 2. Majority/minority bonuses
    // 3. Determine winner
  }
}
