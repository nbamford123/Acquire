import { html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { getGame, sendAction } from '../services/ApiService.ts';
import {
  ActionTypes,
  type ClientAction,
  COLS,
  createAction,
  GamePhase,
  type GameView,
  HOTEL_CONFIG,
  type HOTEL_NAME,
  hotelList,
  type HotelView,
  isPlayerView,
  type OrcCount,
  type PlayerView,
  ROWS,
  SAFE_HOTEL_SIZE,
} from '@acquire/engine/types';
import { getTileLabel } from '@acquire/engine/utils';
import { LightComponent } from './LightComponent.ts';
import './ActionCard.ts';

import { hotelIcons, styles } from './gameBoardView.styles.ts';
import { gameStatus } from './gameStatus.ts';

// How often to check for other players' moves, by how long the game has been quiet: often while
// it's active, less as it sits, and not at all after a long quiet spell, until the player is back
const POLL_SCHEDULE = [
  { quietFor: 60_000, every: 3_000 },
  { quietFor: 5 * 60_000, every: 10_000 },
  { quietFor: 10 * 60_000, every: 30_000 },
];
const FASTEST_POLL_MS = POLL_SCHEDULE[0].every;

@customElement('game-board-view')
export class GameBoardView extends LightComponent {
  @property({ type: String })
  accessor gameId: string | null = null;

  @property({ type: String })
  accessor user: string | null = null;

  @state()
  // A player's view, or a spectator's when the user isn't in the game
  private accessor playerView: GameView | PlayerView | null = null;

  @state()
  private accessor loading = false;

  @state()
  private accessor pendingAction: { action: ClientAction; description: string } | undefined;

  @state()
  // The game has been quiet too long to keep checking
  private accessor pollingPaused = false;

  private pollTimer?: ReturnType<typeof setTimeout>;
  private nextPollAt = Infinity;
  // When the game last changed or the player last did something
  private lastActiveAt = Date.now();
  private polling = false;
  private submitting = false;
  static override styles = [
    styles,
  ];

  public override connectedCallback() {
    super.connectedCallback();
    this.lastActiveAt = Date.now();
    this.loadGameState();
    this.schedulePoll();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('pointerdown', this.handleActivity);
    document.addEventListener('keydown', this.handleActivity);
    globalThis.addEventListener('focus', this.handleActivity);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopPolling();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('pointerdown', this.handleActivity);
    document.removeEventListener('keydown', this.handleActivity);
    globalThis.removeEventListener('focus', this.handleActivity);
  }

  // Polling skips hidden tabs, so catch up as soon as the tab is back
  private handleVisibilityChange = () => {
    if (document.hidden) return;
    this.lastActiveAt = Date.now();
    this.pollGameState();
  };

  // The player is here, so check at the fastest rate again, right away if checking had paused
  private handleActivity = () => {
    this.lastActiveAt = Date.now();
    if (this.pollingPaused) this.pollGameState();
    else if (this.nextPollAt > Date.now() + FASTEST_POLL_MS) this.schedulePoll();
  };

  private stopPolling() {
    clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
    this.nextPollAt = Infinity;
    this.pollingPaused = false;
  }

  // Sets the next poll by how long the game has been quiet
  private schedulePoll() {
    this.stopPolling();
    // Finished games don't change
    if (this.playerView?.finalStandings || !this.isConnected) return;
    const quiet = Date.now() - this.lastActiveAt;
    const delay = POLL_SCHEDULE.find(({ quietFor }) => quiet < quietFor)?.every;
    if (delay === undefined) {
      this.pollingPaused = true;
      return;
    }
    this.nextPollAt = Date.now() + delay;
    this.pollTimer = setTimeout(() => this.pollGameState(), delay);
  }

  // Picks up other players' moves. The view is only replaced when the game has moved on, so
  // selections in progress survive, and a slow response can't overwrite a newer state. Sending the
  // current lastUpdated lets the service skip reading the game when nothing changed.
  private async pollGameState() {
    // The poll in flight schedules the next one
    if (this.polling) return;
    // The tab coming back starts polling again
    if (document.hidden) {
      this.stopPolling();
      return;
    }
    if (this.submitting || this.loading || !this.gameId) {
      this.schedulePoll();
      return;
    }
    this.polling = true;
    try {
      const since = this.playerView?.lastUpdated;
      const game = (await getGame(this.gameId, { silent: true, since }))?.game;
      if (
        game && !this.submitting &&
        game.lastUpdated > (this.playerView?.lastUpdated ?? 0)
      ) {
        this.playerView = game;
        // Any selection was made against the old state
        this.pendingAction = undefined;
        this.lastActiveAt = Date.now();
      }
    } catch {
      // Network hiccup, try again on the next poll
    } finally {
      this.polling = false;
      this.schedulePoll();
    }
  }

  private playedTile = ({ row, col }: { row: number; col: number }) =>
    this.pendingAction && this.pendingAction.action.type === ActionTypes.PLAY_TILE &&
    this.pendingAction.action.payload.tile.row === row &&
    this.pendingAction.action.payload.tile.col === col;

  private async loadGameState() {
    this.loading = true;
    try {
      this.playerView = this.gameId ? (await getGame(this.gameId))?.game ?? null : null;
    } finally {
      this.loading = false;
    }
  }

  // The user's view when they're in the game, otherwise undefined
  private get seat() {
    return this.playerView && isPlayerView(this.playerView) ? this.playerView : undefined;
  }

  private handleTileClick(tile: { row: number; col: number }) {
    if (
      this.seat?.currentPlayer === this.seat?.playerId &&
      this.seat?.currentPhase === GamePhase.PLAY_TILE
    ) {
      this.pendingAction = {
        action: createAction(ActionTypes.PLAY_TILE, { tile }),
        description: `Play tile ${getTileLabel(tile)}`,
      };
    }
  }

  private handleSetAction(e: CustomEvent) {
    // A null action means the current selection isn't complete yet
    if (!e.detail) {
      this.pendingAction = undefined;
      return;
    }
    const action = e.detail as ClientAction;
    const desc = action.type === ActionTypes.FOUND_HOTEL
      ? `Found hotel ${action.payload.hotelName}`
      : `${action.type}`;

    this.pendingAction = { action, description: desc };
  }

  // Each hotel's marker sits on its topmost tile, the leftmost of those
  private markerTiles(view: GameView) {
    const markers = new Map<string, HOTEL_NAME>();
    for (const { name: hotel } of hotelList(view.hotels)) {
      const tiles = view.board.filter((tile) => tile.hotel === hotel);
      if (!tiles.length) continue;
      const at = tiles.reduce((first, tile) =>
        tile.row < first.row || (tile.row === first.row && tile.col < first.col) ? tile : first
      );
      markers.set(`${at.row},${at.col}`, hotel);
    }
    return markers;
  }

  private renderBoard() {
    const cells: TemplateResult<1>[] = [];
    const markers = this.playerView ? this.markerTiles(this.playerView) : new Map();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const position = getTileLabel({ row, col });
        const placedTile = this.playerView?.board.find((tile) =>
          tile.row === row && tile.col === col
        );
        const marker = markers.get(`${row},${col}`);
        cells.push(html`
          <div
            class="board-cell ${placedTile
              ? 'placed'
              : ''} ${placedTile?.hotel?.toLocaleLowerCase() || ''}"
          >
            ${marker
              ? html`
                <span class="cell-marker" aria-hidden="true">${hotelIcons[marker]}</span>
                <span class="sr-only">${position}, ${marker}</span>
              `
              : html`
                ${position}${placedTile
                  ? html`
                    <span class="sr-only">, ${placedTile.hotel ?? 'placed'}</span>
                  `
                  : ''}
              `}
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
        const { size, price } = view.hotels[hotel];
        // Shares in a defunct hotel have no price until it's founded again
        const value = size > 0 ? count * price : undefined;
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
                <span><span class="hotel-dot ${hotel
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
                <span class="share-chip hotel-tint ${hotel.toLocaleLowerCase()}">
                  ${hotel}
                  <span class="sr-only">: ${count === 'many' ? '3 or more' : count} shares</span>
                  <span class="share-pips" aria-hidden="true">
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

  // What the physical game's information card says about a hotel: its tier, price, and bonuses,
  // at its current size, or at founding size while it's off the board
  private renderHotelChain(
    { name, size, shares, type: tier, price, majority, minority }: HotelView & { name: HOTEL_NAME },
  ) {
    const status = size === 0
      ? 'Inactive'
      : `Size ${size}${size >= SAFE_HOTEL_SIZE ? ' · Safe' : ''}`;
    return html`
      <div class="hotel-chain hotel-tint ${name.toLocaleLowerCase()}">
        <div class="hotel-row">
          <span>
            <span class="hotel-name"><span aria-hidden="true">${hotelIcons[
              name
            ]}</span> ${name}</span>
            <span class="hotel-tier">${tier[0].toUpperCase() + tier.slice(1)}</span>
          </span>
          <span class="hotel-size">${status}</span>
        </div>
        <div class="hotel-row">
          <span class="hotel-stock">Available: ${shares}</span>
          <span class="hotel-price">Share price: $${price.toLocaleString()}</span>
        </div>
        <div class="hotel-row hotel-bonuses">
          <span>Majority $${majority.toLocaleString()}</span>
          <span>Minority $${minority.toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  // Player who needs to act: the next stockholder while resolving a merger, otherwise the current
  // player, and nobody before the game starts or once it's over
  private get activePlayer() {
    if (
      this.playerView?.finalStandings ||
      this.playerView?.currentPhase === GamePhase.WAITING_FOR_PLAYERS
    ) return undefined;
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
                  aria-pressed="${!!this.playedTile({ row, col })}"
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
          @set-action="${(e: CustomEvent) => this.handleSetAction(e)}"
        ></action-card>
        <button
          ?disabled="${this.activePlayer !== view.playerId || !this.pendingAction}"
          @click="${() => this.submitAction()}"
        >
          ${this.submitLabel(view)}
        </button>
      </div>
    `;
  }

  private renderGameOver(view: GameView, standings: NonNullable<GameView['finalStandings']>) {
    const you = isPlayerView(view) ? view.players[view.playerId].name : undefined;
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
    if (!this.gameId || !this.pendingAction) return;
    this.submitting = true;
    try {
      const resp = await sendAction(this.gameId, this.pendingAction.action);
      // A rejected move keeps the selection, so the player can change it or send it again
      if (!resp) return;
      this.pendingAction = undefined;
      if (resp.game) {
        this.playerView = resp.game;
      }
      // The other players answer this move, so check for theirs at the fastest rate
      this.handleActivity();
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
          <div class="game-heading">
            <h2>${this.gameId}</h2>
            <p class="game-status ${this.seat && this.activePlayer === this.seat.playerId
              ? 'your-move'
              : ''}">${gameStatus(this.playerView)}</p>
            ${this.seat ? '' : html`
              <p class="spectating">You're watching this game</p>
            `}
            ${this.pollingPaused
              ? html`
                <p class="polling-paused">
                  No moves for a while, so updates are paused. Click anywhere to check again.
                </p>
              `
              : ''}
          </div>

          <details class="game-log">
            <summary>Recent moves</summary>
            <ul>
              ${this.playerView.actions.map((action) =>
                html`
                  <li>${action.action}</li>
                `
              )}
            </ul>
          </details>
          <div class="game-board">
            ${this.renderBoard()}
          </div>

          ${this.playerView.finalStandings
            ? this.renderGameOver(this.playerView, this.playerView.finalStandings)
            : this.seat
            ? this.renderPlayerControls(this.seat)
            : ''}

        <div class="players-sidebar">
          ${this.playerView.players.map((player, index) =>
            html`
              <article class="player-card ${index === this.activePlayer ? 'active' : ''}">
                ${this.seat && index === this.seat.playerId
                  ? this.renderYourHoldings(this.seat)
                  : this.renderOtherHoldings(player)}
              </article>
            `
          )}
        </div>
        <div class="bank-section">
          <article class="bank-card">
            <h3>Hotel Chains</h3>
            ${hotelList(this.playerView.hotels).map((hotel) => this.renderHotelChain(hotel))}
          </article>
        </div>

      </div>
    `;
  }
}
