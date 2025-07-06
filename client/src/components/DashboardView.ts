import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { GameState } from "../types.ts";

@customElement("dashboard-view")
export class DashboardView extends LitElement {
  @property({ type: Object })
  user: string | null = null;
  @state()
  private games: GameState[] = [];
  @state()
  private loading = false;

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: calc(100vh - 4rem);
    }

    .container {
      max-width: 56rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .create-button {
      background: #2563eb;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .create-button:hover {
      background: #1d4ed8;
    }

    .loading-container {
      text-align: center;
      padding: 2rem 0;
    }

    .loading-text {
      color: #4b5563;
    }

    .games-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }

    @media (min-width: 768px) {
      .games-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .games-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .game-card {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      cursor: pointer;
      transition: box-shadow 0.15s ease;
    }

    .game-card:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .game-title {
      font-weight: 600;
      font-size: 1.125rem;
      margin: 0 0 0.5rem 0;
    }

    .game-players {
      color: #4b5563;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }

    .game-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .game-phase {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: capitalize;
    }

    .join-button {
      color: #2563eb;
      font-size: 0.875rem;
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .join-button:hover {
      color: #1d4ed8;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 0;
      color: #6b7280;
    }

    .empty-title {
      font-size: 1.125rem;
      margin: 0 0 1rem 0;
    }

    .empty-description {
      font-size: 0.875rem;
      margin: 0;
    }
  `;

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGames();
  }

  private async loadGames() {
    this.loading = true;
    try {
      const response = await fetch("/api/games");
      this.games = await response.json();
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      this.loading = false;
    }
  }

  private handleGameSelect(gameId: string) {
    this.dispatchEvent(
      new CustomEvent<string>("game-select", {
        detail: gameId,
        bubbles: true,
      }),
    );
  }

  private async createNewGame() {
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: this.user }),
      });
      const newGame = await response.json();
      this.handleGameSelect(newGame.id);
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  }

  public override render() {
    return html`
      <div class="container">
        <div class="header">
          <h2 class="title">Available Games</h2>
          <button
            @click="${this.createNewGame}"
            class="create-button"
          >
            Create New Game
          </button>
        </div>

        ${this.loading
        ? html`
          <div class="loading-container">
            <div class="loading-text">Loading games...</div>
          </div>
        `
        : ""}

        <div class="games-grid">
          ${this.games.map((game) =>
        html`
          <div
            class="game-card"
            @click="${() => this.handleGameSelect(game.id)}"
          >
            <h3 class="game-title">Game ${game.id.slice(0, 8)}</h3>
            <p class="game-players">
              ${game.players.length}/${game.maxPlayers || 4} players
            </p>
            <div class="game-footer">
              <span class="game-phase">
                ${game.phase}
              </span>
              <button class="join-button">
                Join Game →
              </button>
            </div>
          </div>
        `
      )}
        </div>

        ${!this.loading && this.games.length === 0
        ? html`
          <div class="empty-state">
            <p class="empty-title">No games available</p>
            <p class="empty-description">Create a new game to get started!</p>
          </div>
        `
        : ""}
      </div>
    `;
  }
}
