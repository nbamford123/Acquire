import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { StyledComponent } from './StyledComponent.ts';
import { GameInfo, GamePhase, MAX_PLAYERS } from '@acquire/engine/types';

// When the game last changed: just the time if it was today, otherwise the date too
export const updatedLabel = (timestamp: number, now = Date.now()) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date(now).toDateString()) return `Updated ${time}`;
  return `Updated ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

@customElement('game-card')
export class DashboardView extends StyledComponent {
  @property({ attribute: false })
  accessor game: GameInfo = {
    id: '',
    currentPlayer: '',
    owner: '',
    players: [],
    phase: GamePhase.WAITING_FOR_PLAYERS,
    lastUpdated: Date.now(),
  };

  @property({ type: String })
  accessor user: string | null = null;

  static override styles = [
    super.styles,
    css`
      /* The host is the dashboard's flex item. It fits a phone screen, otherwise it's wide enough
        for the buttons in one row. */
      :host {
        background-color: transparent;
        flex: 1 1 300px;
        min-width: min(400px, 100%);
        max-width: 520px;
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
        height: 100%;
        margin: 0;
        padding: 1.5rem;
        border-radius: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      @media (prefers-color-scheme: light) {
        :host:not([data-theme="dark"]) .game-card {
          background-color: #fafbfc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
      }

      @media (prefers-color-scheme: dark) {
        :host:not([data-theme="light"]) .game-card {
          background-color: rgb(26, 30.5, 40.25);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
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
        flex-wrap: wrap;
        gap: 0.25rem 1rem;
        font-size: 0.875rem;
        color: hsl(205, 20%, 50%);
        margin-bottom: 1rem;
      }
      /* Wraps on narrow cards instead of squeezing the labels */
      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .card-actions button {
        flex: 1 1 auto;
        margin: 0;
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
          this.game.currentPlayer === this.user ? 'Your' : `${this.game.currentPlayer}\'s`
        } turn`;
    }
  }

  private getPrimaryButton() {
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
          <span>🕐 ${updatedLabel(this.game.lastUpdated)}</span>
        </div>
        <div class="card-actions">
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
