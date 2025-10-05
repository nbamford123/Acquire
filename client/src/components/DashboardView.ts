import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { getApi, postApi } from '../services/ApiService.ts';
import { ActionTypes, GameInfo, GamePhase, MAX_PLAYERS } from '@acquire/engine/types';

@customElement('dashboard-view')
export class DashboardView extends StyledComponent {
  @property({ type: String })
  user: string | null = null;
  static override properties = {
    games: { type: Object, state: true },
    loading: { type: Boolean, state: true },
  };
  private games: GameInfo[] = [];
  private loading = false;

  static override styles = [
    super.styles,
    css`
      :host {
        background-color: transparent;
        width: 100%;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 2rem;
        margin-bottom: 1.5rem;
        margin-top: 1.5rem;
      }

      .section-header h2 {
        margin: 0;
        color: var(--pico-color-azure-600);
      }

      .game-list {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
      }

      .game-status {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-active {
        background-color: hsl(120, 60%, 90%);
        color: hsl(120, 60%, 30%);
      }

      .status-waiting {
        background-color: hsl(45, 100%, 90%);
        color: hsl(45, 100%, 30%);
      }

      .status-finished {
        background-color: hsl(205, 30%, 90%);
        color: hsl(205, 30%, 40%);
      }

      .loading-container {
        text-align: center;
        padding: 2rem 0;
      }

      .loading-text {
        color: #4b5563;
      }

      .game-card {
        flex: 1 1 300px;
        max-width: 350px;
        margin: 0;
        padding: 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .game-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }

      .game-card header {
        background: none;
        border: none;
        padding: 0;
        margin-bottom: 0.75rem;
      }

      .game-card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        color: var(--pico-color-azure-700);
      }

      .game-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: hsl(205, 20%, 50%);
        margin-bottom: 1rem;
      }

      .game-meta span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
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
    `,
  ];

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGames();
  }

  private async loadGames() {
    this.loading = true;
    try {
      const gamesResponse = await getApi('/api/games');
      this.games = gamesResponse.games || [];
    } finally {
      this.loading = false;
      this.requestUpdate('loading', true);
    }
  }

  private handleGameSelect(gameId: string) {
    this.dispatchEvent(
      new CustomEvent<string>('game-select', {
        detail: gameId,
        bubbles: true,
      }),
    );
  }

  private async createNewGame() {
    try {
      const newGame = await postApi('/api/games');
      this.handleGameSelect(newGame.gameId);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  }

  private getStatusClass(phase: GamePhase): string {
    switch (phase) {
      case GamePhase.WAITING_FOR_PLAYERS:
        return 'status-waiting';
      case GamePhase.GAME_OVER:
        return 'status-finished';
      default:
        return 'status-active';
    }
  }

  private getStatusMessage(game: GameInfo): string {
    switch (game.phase) {
      case GamePhase.WAITING_FOR_PLAYERS:
      case GamePhase.GAME_OVER:
        return game.phase;
      default:
        return `${game.currentPlayer === this.user ? 'Your' : `${game.currentPlayer}`}\'s turn`;
    }
  }
  private getGameCard = (game: GameInfo) => {
    return html`
      <article
        class="game-card"
        @click="${() => this.handleGameSelect(game.id)}"
      >
        <header class="game-card-header">
          <h3>${game.id.slice(0, 8)}</h3>
          <span class="${`game-status ${this.getStatusClass(game.phase)}`}">${this.getStatusMessage(
            game,
          )}</span>
        </header>
        <div class="game-meta">
          <span>👥 ${`${game.players.length}/6 players`}</span>
          <span>🕐 ${new Date(new Date().getTime() - game.lastUpdated).toLocaleDateString()}</span>
        </div>
        <button class="join-button" @click="${() => {
          postApi(`/api/games/${game.id}`, {
            type: ActionTypes.ADD_PLAYER,
            payload: {
              player: this.user,
            },
          });
        }}">
        ${/* Also need to check the state to see if the game is in session, we should have a "view" option */ ''}
          ${`${game.players.find((u) => u === this.user) ? 'Play' : 'Join'} Game →`}
        </button>
      </article>
    `;
  };

  public override render() {
    return html`
      ${this.loading
        ? html`
          <div class="loading-container">
            <div class="loading-text">Loading games...</div>
          </div>
        `
        : ''}
      <div class="section-header">
        <h2>Your games</h2>
      </div>
      <div class="game-list">
        ${this.games.filter((game) => game.players.includes(this.user || '')).map(
          this.getGameCard,
        )}
      </div>

      <div class="section-header">
        <h2>Available games</h2>
        <button
          @click="${this.createNewGame}"
        >
          Create New Game
        </button>
      </div>
      <div class="game-list">
        ${this.games.filter((game) => !game.players.includes(this.user || '')).map(
          this.getGameCard,
        )}
      </div>

      ${!this.loading && this.games.length === 0
        ? html`
          <div class="empty-state">
            <p class="empty-title">No games available</p>
            <p class="empty-description">Create a new game to get started!</p>
          </div>
        `
        : ''}
    `;
  }
}
