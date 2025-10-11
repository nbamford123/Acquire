import { css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { getApi } from '../services/ApiService.ts';
import { COLS, type HOTEL_NAME, type OrcCount, type PlayerView, ROWS } from '@acquire/engine/types';
import { getHotelPrice, getTileLabel } from '@acquire/engine/utils';
import { StyledComponent } from './StyledComponent.ts';

@customElement('game-board-view')
export class GameBoardView extends StyledComponent {
  @property({ type: String })
  gameId: string | null = null;

  @property({ type: String })
  private user: string | null = null;

  static override properties = {
    playerView: { type: Object, state: true },
    loading: { type: Boolean, state: true },
  };
  private playerView: PlayerView | null = null;
  private loading = false;

  static override styles = [
    super.styles,
    css`
      :host {
        display: block;
        padding: 1rem;
      }

      .game-container {
        display: grid;
        grid-template-columns: 1fr auto 280px;
        gap: 1rem;
        max-width: 1600px;
        margin: 0 auto;
      }

      .board-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .game-board {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        grid-template-rows: repeat(9, 1fr);
        gap: 4px;
        background: var(--pico-background-color);
        padding: 1rem;
        border-radius: 8px;
        aspect-ratio: 12/9;
        max-width: 900px;
      }

      .board-cell {
        background: var(--pico-card-background-color);
        border: 2px solid var(--pico-muted-border-color);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 40px;
      }

      .board-cell:hover {
        background: var(--pico-primary-hover);
        border-color: var(--pico-primary);
        transform: scale(1.05);
      }

      .board-cell.placed {
        background: var(--pico-primary);
        color: white;
        border-color: var(--pico-primary);
      }

      .current-player-view {
        padding: 1rem;
        background: var(--pico-card-background-color);
        border-radius: 8px;
        border: 2px solid var(--pico-primary);
      }

      .current-player-view h3 {
        margin-top: 0;
        color: var(--pico-primary);
      }

      .tile-hand {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }

      .tile {
        padding: 0.5rem 0.75rem;
        background: var(--pico-secondary);
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        color: var(--pico-contrast);
      }

      .tile:hover {
        background: var(--pico-secondary-hover);
        transform: translateY(-2px);
      }

      .bank-section {
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .bank-card {
        padding: 1rem;
        margin: 0;
        background: var(--pico-card-background-color);
        border-radius: 8px;
        border: 1px solid var(--pico-muted-border-color);
      }

      .bank-card h4 {
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.1rem;
      }

      .bank-cash {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--pico-primary);
        margin-bottom: 0.5rem;
      }

      .hotel-chain {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        border-radius: 6px;
        border: 2px solid;
      }

      .hotel-chain.tower {
        border-color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
      }
      .hotel-chain.luxor {
        border-color: #f39c12;
        background: rgba(243, 156, 18, 0.1);
      }
      .hotel-chain.american {
        border-color: #3498db;
        background: rgba(52, 152, 219, 0.1);
      }
      .hotel-chain.worldwide {
        border-color: #9b59b6;
        background: rgba(155, 89, 182, 0.1);
      }
      .hotel-chain.festival {
        border-color: #1abc9c;
        background: rgba(26, 188, 156, 0.1);
      }
      .hotel-chain.imperial {
        border-color: #e67e22;
        background: rgba(230, 126, 34, 0.1);
      }
      .hotel-chain.continental {
        border-color: #2ecc71;
        background: rgba(46, 204, 113, 0.1);
      }

      .hotel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
      }

      .hotel-name {
        font-weight: 700;
        font-size: 0.95rem;
      }

      .hotel-size {
        font-size: 0.85rem;
        color: var(--pico-muted-color);
      }

      .hotel-stock {
        font-size: 0.85rem;
        color: var(--pico-muted-color);
      }

      .hotel-price {
        font-weight: 600;
        color: var(--pico-primary);
        font-size: 0.9rem;
      }

      .players-sidebar {
        width: 280px;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .player-card {
        padding: 1rem;
        margin: 0;
        background: var(--pico-card-background-color);
        border-radius: 8px;
        border: 1px solid var(--pico-muted-border-color);
      }

      .player-card.active {
        border: 2px solid var(--pico-primary);
        background: var(--pico-primary-focus);
      }

      .player-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .player-name {
        font-weight: 700;
        font-size: 1rem;
        margin: 0;
      }

      .player-cash {
        color: var(--pico-primary);
        font-weight: 600;
        font-size: 0.9rem;
      }

      .player-stocks {
        font-size: 0.85rem;
        color: var(--pico-muted-color);
        margin-top: 0.5rem;
      }

      @media (max-width: 1400px) {
        .game-container {
          grid-template-columns: 1fr;
        }

        .bank-section,
        .players-sidebar {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
      }
    `,
  ];

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGameState();
  }

  private async loadGameState() {
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

  private handleCellClick(position: string) {
    console.log(position);
  }

  private handleTileClick(tile: { row: number; col: number }) {
    console.log(tile);
  }

  private renderBoard() {
    const cells: TemplateResult<1>[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 1; col <= COLS; col++) {
        const position = getTileLabel({ row, col });
        const placedTile = this.playerView?.board.find((tile) =>
          tile.row === row && tile.col === col
        );
        cells.push(html`
          <div
            class="board-cell ${placedTile ? 'placed' : ''} ${placedTile?.hotel || ''}"
            @click="${() => this.handleCellClick(position)}"
          >
            ${position}
          </div>
        `);
      }
    }

    return cells;
  }

  private formatStocks(stocks: Record<HOTEL_NAME, number | OrcCount>) {
    return Object.entries(stocks)
      .map(([chain, count]) => `${chain}: ${count}`)
      .join(' | ');
  }

  public override render() {
    if (this.loading) {
      return html`
        <div>Loading game...</div>
      `;
    }
    if (!this.playerView || !this.user) {
      return html`
        <div>Game not found or error loading.</div>
      `;
    }
    return html`
      <div class="game-container">
        <div class="board-section">
          <h2>Acquire Game Board</h2>

          <div class="game-board">
            ${this.renderBoard()}
          </div>

          <article class="current-player-view">
            <h3>Your Turn</h3>
            <div class="player-header">
              <span class="player-name">${this.user}</span>
              <span class="player-cash">$${this.playerView.money.toLocaleString()}</span>
            </div>
            <div class="player-stocks">
              Stocks: ${this.formatStocks(this.playerView.stocks)}
            </div>
            <div style="margin-top: 1rem;">
              <strong>Your Tiles:</strong>
              <div class="tile-hand">
                ${this.playerView.tiles.map((tile) =>
                  html`
                    <button class="tile" @click="${() => this.handleTileClick(tile)}">
                      ${getTileLabel(tile)}
                    </button>
                  `
                )}
              </div>
            </div>
          </article>
        </div>

        <div class="bank-section">
          <article class="bank-card">
            <h4>Hotel Chains</h4>
            ${Object.entries(this.playerView.hotels).map(([name, { size, shares }]) =>
              html`
                <div class="hotel-chain ${name}">
                  <div class="hotel-header">
                    <span class="hotel-name">${name}</span>
                    <span class="hotel-size">${size > 0 ? `Size: ${size}` : 'Inactive'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="hotel-stock">Available: ${shares}</span>
                    <span class="hotel-price">${size > 0
                      ? `$${getHotelPrice(name as HOTEL_NAME, size)}`
                      : '—'}</span>
                  </div>
                </div>
              `
            )}
          </article>
        </div>

        <div class="players-sidebar">
          ${this.playerView.players.map((player, index) =>
            html`
              <article class="player-card ${index === this.playerView?.currentPlayer
                ? 'active'
                : ''}">
                <div class="player-header">
                  <span class="player-name">
                    ${player.name}
                  </span>
                  <span class="player-cash">$${player.money}</span>
                </div>
                <div class="player-stocks">
                  ${this.formatStocks(player.shares)}
                </div>
              </article>
            `
          )}
        </div>
      </div>
    `;
  }
}
