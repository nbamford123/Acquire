import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { tw } from "twind";

import type { GameState } from "../types.ts";

@customElement("dashboard-view")
export class DashboardView extends LitElement {
  @property({ type: Object }) user: string | null = null;
  
  @state() private games: GameState[] = [];
  @state() private loading = false;

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: calc(100vh - 4rem);
    }
  `;

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGames();
  }

  private async loadGames() {
    this.loading = true;
    try {
      const response = await fetch('/api/games');
      this.games = await response.json();
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      this.loading = false;
    }
  }

  private handleGameSelect(gameId: string) {
    this.dispatchEvent(new CustomEvent<string>("game-select", {
      detail: gameId,
      bubbles: true
    }));
  }

  private async createNewGame() {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: this.user })
      });
      
      const newGame = await response.json();
      this.handleGameSelect(newGame.id);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  }

  public override render() {
    return html`
      <div class=${tw('max-w-4xl mx-auto p-6')}>
        <div class=${tw('flex justify-between items-center mb-8')}>
          <h2 class=${tw('text-2xl font-bold text-gray-900')}>Available Games</h2>
          <button
            @click=${this.createNewGame}
            class=${tw('bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium')}
          >
            Create New Game
          </button>
        </div>

        ${this.loading ? html`
          <div class=${tw('text-center py-8')}>
            <div class=${tw('text-gray-600')}>Loading games...</div>
          </div>
        ` : ''}

        <div class=${tw('grid gap-4 md:grid-cols-2 lg:grid-cols-3')}>
          ${this.games.map(game => html`
            <div class=${tw('bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer')}
                 @click=${() => this.handleGameSelect(game.id)}>
              <h3 class=${tw('font-semibold text-lg mb-2')}>Game ${game.id.slice(0, 8)}</h3>
              <p class=${tw('text-gray-600 text-sm mb-4')}>
                ${game.players.length}/${game.maxPlayers || 4} players
              </p>
              <div class=${tw('flex justify-between items-center')}>
                <span class=${tw('text-sm text-gray-500 capitalize')}>
                  ${game.phase}
                </span>
                <button class=${tw('text-blue-600 hover:text-blue-800 text-sm font-medium')}>
                  Join Game →
                </button>
              </div>
            </div>
          `)}
        </div>

        ${!this.loading && this.games.length === 0 ? html`
          <div class=${tw('text-center py-12 text-gray-500')}>
            <p class=${tw('text-lg mb-4')}>No games available</p>
            <p class=${tw('text-sm')}>Create a new game to get started!</p>
          </div>
        ` : ''}
      </div>
    `;
  }
}
