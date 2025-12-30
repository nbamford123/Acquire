import { html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { getApi, postApi } from '../services/ApiService.ts';
import {
  ActionTypes,
  COLS,
  type GameAction,
  type HOTEL_NAME,
  type OrcCount,
  type PlayerView,
  ROWS,
} from '@acquire/engine/types';
import { getHotelPrice, getTileLabel } from '@acquire/engine/utils';
import { StyledComponent } from './StyledComponent.ts';
import './ActionCard.ts';

import { hotelIcons, styles } from './gameBoardView.styles.ts';
import { GamePhase } from '../../../engine/types/gameState.ts';

@customElement('game-board-view')
export class GameBoardView extends StyledComponent {
  @property({ type: String })
  gameId: string | null = null;

  @property({ type: String })
  private user: string | null = null;

  static override properties = {
    playerView: { type: Object, state: true },
    loading: { type: Boolean, state: true },
    pendingAction: { type: Object, state: true },
  };
  declare playerView: PlayerView | null;
  private loading = false;

  private pendingAction?: { action: GameAction; description: string };
  static override styles = [
    super.styles,
    styles,
  ];

  public constructor() {
    super();
    this.playerView = null;
  }

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGameState();
  }

  private playedTile = ({ row, col }: { row: number; col: number }) =>
    this.pendingAction && this.pendingAction.action.type === ActionTypes.PLAY_TILE &&
    this.pendingAction.action.payload.tile.row === row &&
    this.pendingAction.action.payload.tile.col === col;

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

  private async saveGameState() {
    const saveResponse = await getApi(`/api/save/${this.gameId}`);
    console.log(saveResponse);
  }

  private handleCellClick(position: string) {
    console.log(position);
  }

  private handleTileClick(tile: { row: number; col: number }) {
    if (
      this.playerView?.currentPlayer === this.playerView?.playerId &&
      this.playerView?.currentPhase === GamePhase.PLAY_TILE
    ) {
      this.pendingAction = {
        action: {
          type: ActionTypes.PLAY_TILE,
          payload: { player: this.user || '', tile },
        },
        description: `Play tile ${getTileLabel(tile)}`,
      };
      this.requestUpdate();
    }
  }

  private handleSetAction(e: CustomEvent) {
    console.log('handling action', e.detail);
    const action = e.detail as GameAction;
    const desc = action.type === ActionTypes.FOUND_HOTEL
      ? `Found hotel ${action.payload.hotelName}`
      : `${action.type}`;

    this.pendingAction = { action, description: desc };
    this.requestUpdate();
  }

  private renderBoard() {
    const cells: TemplateResult<1>[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const position = getTileLabel({ row, col });
        const placedTile = this.playerView?.board.find((tile) =>
          tile.row === row && tile.col === col
        );
        cells.push(html`
          <div
            class="board-cell ${placedTile
              ? 'placed'
              : ''} ${placedTile?.hotel?.toLocaleLowerCase() || ''}"
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

  private async submitAction() {
    const resp = await postApi(`/api/games/${this.gameId}`, { action: this.pendingAction?.action });
    this.pendingAction = undefined;
    if (resp.game) {
      this.playerView = resp.game;
    }
    console.log(resp.game);
    this.requestUpdate();
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
          <h2>${this.gameId}</h2>

          <select style="width: 100%; margin-bottom: 1rem; cursor: default;">
            <option>Recent Actions</option>
            ${this.playerView.actions.map((action) =>
              html`
                <option>${action.action}</option>
              `
            )}
          </select>
          <div class="game-board">
            ${this.renderBoard()}
          </div>

          <div class="current-player-view">
            <div class="tile-hand">
              <div class="tiles-title">
                <strong>YOUR TILES</strong>
              </div>
              <div class="tiles-list">
                ${this.playerView.tiles.map((tile) =>
                  html`
                    <button class="${`tile ${
                      this.playedTile(tile) ? 'selected' : ''
                    }`}" @click="${() => this.handleTileClick(tile)}">
                      ${getTileLabel(tile)}
                    </button>
                  `
                )}
              </div>
            </div>
            <action-card
              .playerView="${this.playerView}"
              .user="${this.user}"
              @set-action="${(e: CustomEvent) => this.handleSetAction(e)}"
            ></action-card>
            <button style="margin-left: auto;" @click="${() => this.submitAction()}">
              Submit
            </button>
          </div>
        </div>

        <div class="bank-section">
          <article class="bank-card">
            <h4>Hotel Chains</h4>
            ${Object.entries(this.playerView.hotels).map(([name, { size, shares }]) =>
              html`
                <div class="hotel-chain ${name.toLocaleLowerCase()}">
                  <div class="hotel-header">
                    <span class="hotel-name ${name}">${hotelIcons[name]} ${name}</span>
                    <span class="hotel-size">${size > 0 ? `Size: ${size}` : 'Inactive'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="hotel-stock">Available: ${shares}</span>
                    <span class="hotel-price">${`Share price: $${
                      getHotelPrice(name as HOTEL_NAME, size).price
                    }`}</span>
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
