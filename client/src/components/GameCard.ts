import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { LightComponent } from './LightComponent.ts';
import { GameInfo, GamePhase, MAX_PLAYERS } from '@acquire/engine/types';

// When the game last changed: just the time if it was today, otherwise the date too
export const updatedLabel = (timestamp: number, now = Date.now()) => {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === new Date(now).toDateString()) return `Updated ${time}`;
  return `Updated ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

@customElement('game-card')
export class DashboardView extends LightComponent {
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
    css`
      /* The card's own element is the dashboard's flex item. It fits a phone screen, otherwise
        it's wide enough for the buttons in one row. */
      & {
        background-color: transparent;
        flex: 1 1 300px;
        min-width: min(25rem, 100%);
        max-width: 32.5rem;
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
        color: hsl(120, 60%, 25%);
      }
      .status-waiting {
        background-color: hsl(45, 100%, 90%);
        color: hsl(45, 100%, 25%);
      }
      .status-full {
        background-color: hsl(0, 70%, 92%);
        color: hsl(0, 60%, 25%);
      }
      .status-finished {
        background-color: hsl(205, 30%, 90%);
        color: hsl(205, 30%, 25%);
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
        &:not([data-theme="dark"]) .game-card {
          background-color: #fafbfc;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
      }

      @media (prefers-color-scheme: dark) {
        &:not([data-theme="light"]) .game-card {
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 1.25rem;
        color: var(--pico-primary);
      }
      .game-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 1rem;
        font-size: 0.875rem;
        color: var(--pico-muted-color);
        margin-bottom: 1rem;
      }
      /* Wraps on narrow cards instead of squeezing the labels */
      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .card-actions button,
      .card-actions [role='button'] {
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

  private get isPlayer() {
    return this.game.players.includes(this.user ?? '');
  }

  private get isFull() {
    return this.game.players.length >= MAX_PLAYERS;
  }

  private get waiting() {
    return this.game.phase === GamePhase.WAITING_FOR_PLAYERS;
  }

  private getStatusClass(): string {
    if (this.waiting) return this.isFull ? 'status-full' : 'status-waiting';
    return this.game.phase === GamePhase.GAME_OVER ? 'status-finished' : 'status-active';
  }

  private getStatusMessage(): string {
    if (this.waiting) return this.isFull ? 'Full' : this.game.phase;
    if (this.game.phase === GamePhase.GAME_OVER) return this.game.phase;
    return `${
      this.game.currentPlayer === this.user ? 'Your' : `${this.game.currentPlayer}'s`
    } turn`;
  }

  // The dashboard handles these, confirming first where needed
  private emit(name: 'game-select' | 'game-join' | 'game-start' | 'game-leave' | 'game-delete') {
    this.dispatchEvent(
      new CustomEvent<string>(name, { detail: this.game.id, bubbles: true, composed: true }),
    );
  }

  // A plain click opens the game in the app; modified clicks open a new tab or window as usual
  private openGame(event: MouseEvent) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.emit('game-select');
  }

  private renderActions() {
    const isOwner = this.game.owner === this.user;
    const canJoin = !this.isPlayer && this.waiting && !this.isFull;
    return html`
      ${canJoin
        ? html`
          <button @click="${() => this.emit('game-join')}">Join Game</button>
        `
        : html`
          <a
            role="button"
            href="/game/${encodeURIComponent(this.game.id)}"
            @click="${this.openGame}"
          >${this.isPlayer ? 'Play' : 'View'} Game</a>
        `} ${isOwner && this.waiting && this.game.players.length > 1
        ? html`
          <button class="secondary" @click="${() => this.emit('game-start')}">Start Game</button>
        `
        : ''} ${this.isPlayer && !isOwner && this.waiting
        ? html`
          <button class="secondary outline" @click="${() => this.emit('game-leave')}">
            Leave Game
          </button>
        `
        : ''} ${isOwner
        ? html`
          <button class="contrast" @click="${() => this.emit('game-delete')}">Delete Game</button>
        `
        : ''}
    `;
  }

  public override render() {
    const isOwner = this.game.owner === this.user;
    return html`
      <article class="game-card">
        <header class="game-card-header">
          <h3 title="${this.game.id}">${this.game.id}</h3>
          <span class="${`game-status ${this.getStatusClass()}`}">${this.getStatusMessage()}</span>
        </header>
        <div class="game-meta">
          <span><span aria-hidden="true">👥</span> ${`${this.game.players.length}/${MAX_PLAYERS} players`}</span>
          <span><span aria-hidden="true">👤</span> ${isOwner
            ? 'Your game'
            : `Hosted by ${this.game.owner}`}</span>
          <span><span aria-hidden="true">🕐</span> ${updatedLabel(this.game.lastUpdated)}</span>
        </div>
        <div class="card-actions">${this.renderActions()}</div>
      </article>
    `;
  }
}
