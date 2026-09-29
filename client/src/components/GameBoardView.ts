import { html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

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

// How often to check for other players' moves
const POLL_INTERVAL_MS = 3000;

@customElement('game-board-view')
export class GameBoardView extends StyledComponent {
  @property({ type: String })
  accessor gameId: string | null = null;

  @property({ type: String })
  accessor user: string | null = null;

  @state()
  private accessor playerView: PlayerView | null = null;

  @state()
  private accessor loading = false;

  @state()
  private accessor pendingAction: { action: GameAction; description: string } | undefined;

  private pollTimer?: ReturnType<typeof setInterval>;
  private polling = false;
  private submitting = false;
  static override styles = [
    super.styles,
    styles,
  ];

  public override connectedCallback() {
    super.connectedCallback();
    this.loadGameState();
    this.pollTimer = setInterval(() => this.pollGameState(), POLL_INTERVAL_MS);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
  }

  private stopPolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  // Picks up other players' moves. The view is only replaced when the game has moved on, so
  // selections in progress survive, and a slow response can't overwrite a newer state.
  private async pollGameState() {
    if (this.playerView?.finalStandings) {
      this.stopPolling();
      return;
    }
    if (document.hidden || this.polling || this.submitting || this.loading) return;
    this.polling = true;
    try {
      const response = await getApi(`/api/games/${this.gameId}`, { silent: true });
      const game: PlayerView | undefined = response?.game;
      if (
        game && !this.submitting &&
        game.lastUpdated > (this.playerView?.lastUpdated ?? 0)
      ) {
        this.playerView = game;
        // Any selection was made against the old state
        this.pendingAction = undefined;
      }
    } catch {
      // Network hiccup, try again on the next poll
    } finally {
      this.polling = false;
    }
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
    }
  }

  private handleSetAction(e: CustomEvent) {
    console.log('handling action', e.detail);
    // A null action means the current selection isn't complete yet
    if (!e.detail) {
      this.pendingAction = undefined;
      return;
    }
    const action = e.detail as GameAction;
    const desc = action.type === ActionTypes.FOUND_HOTEL
      ? `Found hotel ${action.payload.hotelName}`
      : `${action.type}`;

    this.pendingAction = { action, description: desc };
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

  // Your own card shows exact cash, shares, and what the shares are worth at current prices
  private renderYourHoldings(view: PlayerView) {
    const holdings = (Object.entries(view.stocks) as [HOTEL_NAME, number][]).map(
      ([hotel, count]) => {
        const size = view.hotels[hotel]?.size ?? 0;
        // Shares in a defunct hotel have no price until it's founded again
        const value = size > 0 ? count * getHotelPrice(hotel, size).price : undefined;
        return { hotel, count, value };
      },
    );
    const worth = holdings.reduce((total, { value }) => total + (value ?? 0), 0);
    return html`
      <div class="player-header">
        <span class="player-name">${view.players[view.playerId].name}
          <span class="you-badge">You</span></span>
        <span class="player-cash">$${view.money.toLocaleString()}</span>
      </div>
      ${holdings.length
        ? html`
          ${holdings.map(({ hotel, count, value }) =>
            html`
              <div class="holding-row">
                <span><span class="hotel-dot hotel-color ${hotel
                  .toLocaleLowerCase()}"></span>${hotel}</span>
                <span>${count} <span class="holding-value">· ${value === undefined
                  ? 'inactive'
                  : `$${value.toLocaleString()}`}</span></span>
              </div>
            `
          )}
          <div class="holding-row holding-total">
            <span class="holding-value">Shares worth</span>
            <span>$${worth.toLocaleString()}</span>
          </div>
        `
        : html`
          <div class="player-stocks">No shares</div>
        `}
    `;
  }

  // Other players only show relative amounts, like eyeballing their stacks across the table
  private renderOtherHoldings(player: PlayerView['players'][number]) {
    const shares = Object.entries(player.shares) as [HOTEL_NAME, OrcCount][];
    return html`
      <div class="player-header">
        <span class="player-name">${player.name}</span>
        <span class="cash-meter" role="img" aria-label="Cash: tier ${player.money} of 4">
          ${[1, 2, 3, 4].map((tier) =>
            html`
              <span class="cash-segment ${tier <= player.money ? 'filled' : ''}"></span>
            `
          )}
        </span>
      </div>
      ${shares.length
        ? html`
          <div class="share-chips">
            ${shares.map(([hotel, count]) =>
              html`
                <span
                  class="share-chip hotel-color ${hotel.toLocaleLowerCase()}"
                  aria-label="${hotel}: ${count === 'many' ? '3 or more' : count} shares"
                >
                  ${hotel}
                  <span class="share-pips">
                    ${Array.from({ length: count === 'many' ? 3 : Number(count) }, () =>
                      html`
                        <span class="share-pip"></span>
                      `)}${count === 'many' ? '+' : ''}
                  </span>
                </span>
              `
            )}
          </div>
        `
        : html`
          <div class="player-stocks">No shares</div>
        `}
    `;
  }

  // Player who needs to act: the next stockholder while resolving a merger, otherwise the current
  // player, and nobody once the game is over
  private get activePlayer() {
    if (this.playerView?.finalStandings) return undefined;
    return this.playerView?.pendingMergePlayer ?? this.playerView?.currentPlayer;
  }

  private renderPlayerControls(view: PlayerView) {
    return html`
      <div class="current-player-view">
        <div class="tile-hand">
          <div class="tiles-title">
            <strong>YOUR TILES</strong>
          </div>
          <div class="tiles-list">
            ${view.tiles.map(({ row, col, unplayable }) =>
              html`
                <button
                  class="tile ${this.playedTile({ row, col }) ? 'selected' : ''}"
                  ?disabled="${!!unplayable}"
                  title="${unplayable ? `Can't be played: ${unplayable}` : ''}"
                  @click="${() => this.handleTileClick({ row, col })}"
                >
                  ${getTileLabel({ row, col })}
                </button>
              `
            )}
          </div>
        </div>
        <action-card
          .playerView="${view}"
          .user="${this.user}"
          @set-action="${(e: CustomEvent) => this.handleSetAction(e)}"
        ></action-card>
        <button
          style="margin-left: auto;"
          ?disabled="${this.activePlayer !== view.playerId || !this.pendingAction}"
          @click="${() => this.submitAction()}"
        >
          ${this.submitLabel(view)}
        </button>
      </div>
    `;
  }

  private renderGameOver(view: PlayerView, standings: NonNullable<PlayerView['finalStandings']>) {
    const you = view.players[view.playerId].name;
    const top = standings[0]?.money;
    const winners = standings.filter(({ money }) => money === top).map(({ name }) =>
      name === you ? 'You' : name
    );
    const headline = winners.length === 1
      ? `${winners[0]} ${winners[0] === 'You' ? 'win' : 'wins'}`
      : `${winners.slice(0, -1).join(', ')} and ${winners.at(-1)} tie`;
    return html`
      <div class="current-player-view game-over">
        <div class="game-over-summary">
          <div class="tiles-title"><strong>GAME OVER</strong></div>
          <div class="game-over-headline">${headline}</div>
        </div>
        <ol class="standings">
          ${standings.map(({ name, money }) =>
            html`
              <li class="${money === top ? 'winner' : ''}">
                <span>
                  ${standings.findIndex((standing) => standing.money === money) + 1}.
                  ${name}${name === you
                    ? html`
                      <span class="you-badge">You</span>
                    `
                    : null}
                </span>
                <span class="standing-money">$${money.toLocaleString()}</span>
              </li>
            `
          )}
        </ol>
      </div>
    `;
  }

  private submitLabel(view: PlayerView) {
    if (this.activePlayer !== view.playerId) return 'Waiting…';
    const action = this.pendingAction?.action;
    const skipBuying = action?.type === ActionTypes.BUY_SHARES &&
      !Object.values(action.payload.shares).some((count) => count > 0);
    return skipBuying ? 'Skip buying' : 'Submit';
  }

  private async submitAction() {
    this.submitting = true;
    try {
      const resp = await postApi(`/api/games/${this.gameId}`, {
        action: this.pendingAction?.action,
      });
      this.pendingAction = undefined;
      if (resp?.game) {
        this.playerView = resp.game;
      }
    } finally {
      this.submitting = false;
    }
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

          ${this.playerView.finalStandings
            ? this.renderGameOver(this.playerView, this.playerView.finalStandings)
            : this.renderPlayerControls(this.playerView)}
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
              <article class="player-card ${index === this.activePlayer ? 'active' : ''}">
                ${index === this.playerView?.playerId
                  ? this.renderYourHoldings(this.playerView)
                  : this.renderOtherHoldings(player)}
              </article>
            `
          )}
        </div>
      </div>
    `;
  }
}
