import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { GameInfo, GamePhase, MAX_PLAYERS } from '@acquire/engine/types';

@customElement('game-card')
export class DashboardView extends StyledComponent {
  private game: GameInfo;

  @property({ type: String })
  user: string | null = null;

  constructor() {
    super();
    this.game = {
      id: '',
      currentPlayer: '',
      owner: '',
      players: [],
      phase: GamePhase.WAITING_FOR_PLAYERS,
      lastUpdated: Date.now(),
    };
  }

  static override styles = [
    super.styles,
    css`
      :host {
        background-color: transparent;
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
      .game-card {
        flex: 1 1 300px;
        max-width: 350px;
        margin: 0;
        padding: 1.5rem;
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
    `,
  ];

  private getStatusClass(): string {
    switch (this.game.phase) {
      case GamePhase.WAITING_FOR_PLAYERS:
        return 'status-waiting';
      case GamePhase.GAME_OVER:
        return 'status-finished';
      default:
        return 'status-active';
    }
  }

  private getStatusMessage(): string {
    switch (this.game.phase) {
      case GamePhase.WAITING_FOR_PLAYERS:
      case GamePhase.GAME_OVER:
        return this.game.phase;
      default:
        return `${
          this.game.currentPlayer === this.user ? 'Your' : `${this.game.currentPlayer}`
        }\'s turn`;
    }
  }

  private getPrimaryButton() {
    const isOwner = this.game.owner === this.user;
    const curPlayer = this.game.players.find((u) => u === this.user);
    const isFull = this.game.players.length >= MAX_PLAYERS;
    const canJoin = !curPlayer && !isFull && this.game.phase === GamePhase.WAITING_FOR_PLAYERS;
    if (canJoin) {
      return html`
        <button @click="${() =>
          this.dispatchEvent(
            new CustomEvent<string>('game-join', {
              detail: this.game.id,
              bubbles: true,
              composed: true,
            }),
          )}">Join Game</button>
      `;
    }
    return html`
      <button @click="${() =>
        this.dispatchEvent(
          new CustomEvent<string>('game-select', {
            detail: this.game.id,
            bubbles: true,
            composed: true,
          }),
        )}">${`${curPlayer ? 'Play' : 'View'} Game`}</button>
    `;
  }

  public override render() {
    const isOwner = this.game.owner === this.user;
    const curPlayer = this.game.players.find((u) => u === this.user);
    const isFull = this.game.players.length >= MAX_PLAYERS;
    const canJoin = !curPlayer && !isFull && this.game.phase === GamePhase.WAITING_FOR_PLAYERS;

    return html`
      <article
        class="game-card"
      >
        <header class="game-card-header">
          <h3>${this.game.id.slice(0, 8)}</h3>
          <span class="${`game-status ${this.getStatusClass()}`}">${this.getStatusMessage()}</span>
        </header>
        <div class="game-meta">
          <span>👥 ${`${this.game.players.length}/6 players`}</span>
          <span>🕐 ${new Date(new Date().getTime() - this.game.lastUpdated)
            .toLocaleDateString()}</span>
        </div>
        <div role="group">
          ${this
            .getPrimaryButton()} ${isOwner && this.game.phase === GamePhase.WAITING_FOR_PLAYERS &&
              this.game.players.length > 1
            ? html`
              <button class="secondary" @click="${() =>
                this.dispatchEvent(
                  new CustomEvent<string>('game-start', {
                    detail: this.game.id,
                    bubbles: true,
                    composed: true,
                  }),
                )}">Start Game</button>
            `
            : ''} ${isOwner
            ? html`
              <button class="contrast" @click="${() =>
                this.dispatchEvent(
                  new CustomEvent<string>('game-delete', {
                    detail: this.game.id,
                    bubbles: true,
                    composed: true,
                  }),
                )}">Delete Game</button>
            `
            : ''}
        </div>
      </article>
    `;
  }
}
