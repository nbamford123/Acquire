import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { deleteApi, getApi, postApi } from '../services/ApiService.ts';
import { ActionTypes, AddPlayerAction, GameInfo, StartGameAction } from '@acquire/engine/types';

import './GameCard.ts';

@customElement('dashboard-view')
export class DashboardView extends StyledComponent {
  @property({ type: String })
  user: string | null = null;

  @property({ type: Function })
  showConfirmationDialog?: (title: string, message: string) => Promise<boolean>;

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
    const newGame = await postApi('/api/games');
    this.handleGameSelect(newGame.gameId);
  }

  private handleGameJoin = async (event: CustomEvent<string>) => {
    const action: AddPlayerAction = {
      type: ActionTypes.ADD_PLAYER,
      payload: { player: this.user || '' },
    };
    const response = await postApi(`/api/games/${event.detail}`, {
      action,
    });
    if (response) { // a null here means the join failed and hopefully error handling showed a toast error
      this.handleGameSelect(event.detail);
    }
  };

  private handleGameStart = async (event: CustomEvent<string>) => {
    const action: StartGameAction = {
      type: ActionTypes.START_GAME,
      payload: { player: this.user || '' },
    };
    const response = await postApi(`/api/games/${event.detail}`, {
      action,
    });
    if (response) { // a null here means the join failed and hopefully error handling showed a toast error
      this.handleGameSelect(event.detail);
    }
  };

  private handleGameDelete = async (event: CustomEvent<string>) => {
    const confirmation = this.showConfirmationDialog && await this.showConfirmationDialog(
      'Delete Game',
      `Are you sure you want to delete game ${event.detail}?`,
    );
    if (confirmation) {
      await deleteApi(`/api/games/${event.detail}`);
      this.loadGames();
    }
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
