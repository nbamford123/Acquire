import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { getApi } from '../services/ApiService.ts';
import type { PlayerView } from '@acquire/engine/types';

@customElement('game-board-view')
export class GameBoardView extends LitElement {
  @property({ type: String })
  gameId: string | null = null;
  @property({ type: String })
  playerId: string | null = null;
  static override properties = {
    playerView: { type: Object, state: true },
    loading: { type: Boolean, state: true },
  };
  private playerView: PlayerView | null = null;
  private loading = false;

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: calc(100vh - 4rem);
    }
    .board-layout {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: stretch;
      height: 70vh;
      margin: 2rem 0;
    }
    .side-panel {
      width: 12rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      justify-content: flex-start;
      align-items: stretch;
    }
    .game-board {
      background: #f3f4f6;
      border-radius: 0.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
      display: grid;
      grid-template-columns: repeat(12, 2.5rem);
      grid-template-rows: repeat(9, 2.5rem);
      gap: 0.25rem;
      align-items: center;
      justify-items: center;
    }
    .tile {
      width: 2.5rem;
      height: 2.5rem;
      background: white;
      border-radius: 0.25rem;
      border: 1px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: box-shadow 0.15s;
    }
    .tile.hotel {
      background: #e0e7ff;
      border-color: #6366f1;
    }
    .player-info {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
      padding: 1rem;
      margin-bottom: 1rem;
      font-size: 0.95rem;
    }
    .bottom-panel {
      width: 100%;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 1.5rem 0.5rem 1.5rem 0.5rem;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 2rem;
    }
    .current-player-info {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
      padding: 1.5rem;
      min-width: 20rem;
      font-size: 1rem;
    }
    .tiles-list {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .share-list {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .share {
      background: #e0e7ff;
      color: #3730a3;
      border-radius: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.9rem;
      font-weight: 500;
    }
  `;

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGameState();
  }

  async loadGameState() {
    this.loading = true;
    try {
      const playerViewResponse = await getApi(`/api/games/${this.gameId}`);
      this.playerView = playerViewResponse.game;
      console.log({ playerView: this.playerView });
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  renderBoard() {
    if (!this.playerView) {
      return html`
        <div>Loading...</div>
      `;
    }
    // Board is 12x9
    const boardTiles = Array.from(
      { length: 9 },
      (_, row) =>
        Array.from({ length: 12 }, (_, col) => {
          const tile = this.playerView!.board.find((t) => t.row === row && t.col === col);
          return html`
            <div class="tile${tile?.hotel ? ' hotel' : ''}">
              ${tile
                ? (tile.hotel ? tile.hotel : `${row + 1}${String.fromCharCode(65 + col)}`)
                : ''}
            </div>
          `;
        }),
    );
    return html`
      <div class="game-board">
        ${boardTiles.flat()}
      </div>
    `;
  }

  renderSidePlayers(position: 'left' | 'right') {
    if (!this.playerView) return null;
    // Exclude current player
    // Split for left/right
    const half = Math.ceil(this.playerView.players.length / 2);
    const sidePlayers = position === 'left'
      ? this.playerView.players.slice(0, half)
      : this.playerView.players.slice(half);
    return html`
      <div class="side-panel">
        ${sidePlayers.map((p) =>
          html`
            <div class="player-info">
              <div><strong>${p.name}</strong></div>
              <div>Money: $${p.money}</div>
              <div class="share-list">
                ${Object.entries(p.shares).map(([hotelName, shareCount]) =>
                  html`
                    <span class="share">${hotelName} (${shareCount})</span>
                  `
                )}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  renderCurrentPlayerPanel() {
    if (!this.playerView) return null;
    const player = this.playerView;
    // TODO(me): how is currentplayer going to be available here? Passed as an attribute?
    return html`
      <div class="current-player-info">
        <div><strong>YOU</strong> (You)</div>
        <div>Money: $${player.money}</div>
        <div>Shares:</div>
        <div class="share-list">
          ${Object.entries(player.stocks).map(([hotelName, shares]) =>
            html`
              <span class="share">${hotelName} (${shares})</span>
            `
          )}
        </div>
        <div>Your Tiles:</div>
        <div class="tiles-list">
          ${player.tiles.map((t) =>
            html`
              <span class="tile">${t.row + 1}${String.fromCharCode(
                65 + t.col,
              )}</span>
            `
          )}
        </div>
      </div>
    `;
  }

  public override render() {
    if (this.loading) {
      return html`
        <div>Loading game...</div>
      `;
    }
    if (!this.playerView) {
      return html`
        <div>Game not found or error loading.</div>
      `;
    }
    return html`
      <div class="board-layout">
        ${this.renderSidePlayers('left')} ${this.renderBoard()} ${this
          .renderSidePlayers('right')}
      </div>
      <div class="bottom-panel">
        ${this.renderCurrentPlayerPanel()}
      </div>
    `;
  }
}
