import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { deleteApi, getApi, postApi } from '../services/ApiService.ts';
import {
  ActionTypes,
  type AddPlayerAction,
  type GameInfo,
  type RemovePlayerAction,
  type StartGameAction,
} from '@acquire/engine/types';

import './GameCard.ts';

@customElement('dashboard-view')
export class DashboardView extends StyledComponent {
  @property({ type: String })
  accessor user: string | null = null;

  @property({ attribute: false })
  accessor showConfirmationDialog:
    | ((title: string, message: string) => Promise<boolean>)
    | undefined;

  @state()
  private accessor games: GameInfo[] = [];

  @state()
  private accessor loading = false;

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
        padding-left: min(1.5rem, 4vw);
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

  private confirm(title: string, message: string) {
    return this.showConfirmationDialog?.(title, message) ?? Promise.resolve(false);
  }

  private handleGameJoin = async (event: CustomEvent<string>) => {
    if (!await this.confirm('Join Game', `Join game ${event.detail}?`)) return;
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
    const confirmed = await this.confirm(
      'Start Game',
      `Start game ${event.detail}? No one else can join once it starts.`,
    );
    if (!confirmed) return;
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

  private handleGameLeave = async (event: CustomEvent<string>) => {
    if (!await this.confirm('Leave Game', `Leave game ${event.detail}?`)) return;
    const action: RemovePlayerAction = {
      type: ActionTypes.REMOVE_PLAYER,
      payload: { player: this.user || '' },
    };
    await postApi(`/api/games/${event.detail}`, { action });
    this.loadGames();
  };

  private handleGameDelete = async (event: CustomEvent<string>) => {
    const confirmed = await this.confirm(
      'Delete Game',
      `Are you sure you want to delete game ${event.detail}?`,
    );
    if (confirmed) {
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
        @game-leave="${this.handleGameLeave}"
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
