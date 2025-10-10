import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { getApi, postApi } from '../services/ApiService.ts';
import { ActionTypes, GameInfo, GamePhase, MAX_PLAYERS } from '@acquire/engine/types';

import './GameCard.ts';

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
      .loading-container {
        text-align: center;
        padding: 2rem 0;
      }
      .loading-text {
        color: #4b5563;
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
    console.log('Game selected:', gameId);
    this.dispatchEvent(
      new CustomEvent<string>('game-select', {
        detail: gameId,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleCreateGame() {
    try {
      const newGame = await postApi('/api/games');
      this.handleGameSelect(newGame.gameId);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  }

  private handleGameJoin = (event: CustomEvent<string>) => {
    console.log('Game join requested:', event.detail);
    // For now, treat join like select; actual join flow handled elsewhere
  };

  private handleGameStart = (event: CustomEvent<string>) => {
    console.log('Game start requested:', event.detail);
    // TODO(@nbamford123): Call API to start game; navigate to game view for now
  };

  private handleGameDelete = (event: CustomEvent<string>) => {
    console.log('Game delete requested:', event.detail);
    // TODO(@nbamford123): Call API to delete then refresh dashboard; navigate to list for now
  };

  private getGameCard = (game: GameInfo) =>
    html`
      <game-card
        .game="${game}"
        user="${this.user || ''}"
        @game-join="${this.handleGameJoin}"
        @game-delete="${this.handleGameDelete}"
        @game-start="${this.handleGameStart}"
      ></game-card>
    `;

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
        ${this.games.filter((game) => game.players.includes(this.user || '')).map(this.getGameCard)}
      </div>

      <div class="section-header">
        <h2>Available games</h2>
        <button
          @click="${this.handleCreateGame}"
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
