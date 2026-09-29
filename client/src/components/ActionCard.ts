import { css, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  ActionTypes,
  type GameAction,
  GamePhase,
  type HOTEL_NAME,
  type PlayerView,
} from '@acquire/engine/types';
import { StyledComponent } from './StyledComponent.ts';
import { foundHotelTemplate } from './foundHotelTemplate.ts';
import {
  buyableHotels,
  buyStocksTemplate,
  type ShareSelection,
  updateShareSelection,
} from './buyStocksTemplate.ts';
import {
  breakMergerTieTemplate,
  completeTieSelection,
  type TieSelection,
} from './breakMergerTieTemplate.ts';
import {
  mergerLimits,
  type MergerShares,
  resolveMergerTemplate,
  updateMergerShares,
} from './resolveMergerTemplate.ts';
import { actionCardStyles } from './actionCardStyles.ts';

@customElement('action-card')
export class ActionCard extends StyledComponent {
  @property({ attribute: false })
  accessor playerView: PlayerView | null = null;

  @property({ type: String })
  accessor user: string | null = null;

  @state()
  private accessor selectedShares: ShareSelection = {};

  @state()
  private accessor buyError: string | undefined;

  @state()
  private accessor tieSelection: TieSelection = {};

  @state()
  private accessor mergerShares: MergerShares = { sell: 0, trade: 0 };

  @state()
  private accessor mergerError: string | undefined;

  // Identifies the decision on screen, so selections reset when it changes
  private decisionKey = '';
  private dispatchDefaultAction = false;

  static override styles = [
    super.styles,
    actionCardStyles,
    css`
      :host {
        /* Wraps under the tiles when there isn't room beside them */
        flex: 1 1 24rem;
        min-width: 0;
      }
      .action-card {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
      }
      .action-title {
        font-size: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .action-desc {
        font-size: 1.5rem;
      }
    `,
  ];

  private setAction(action: GameAction | null) {
    this.dispatchEvent(
      new CustomEvent('set-action', {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!changed.has('playerView')) return;
    const view = this.playerView;
    const key = [
      view?.currentTurn,
      view?.currentPlayer,
      view?.currentPhase,
      view?.mergeContext?.survivingHotel,
      view?.mergeContext?.mergedHotel,
      view?.pendingMergePlayer,
      view?.mergerTieContext?.tiedHotels.join(),
    ].join('|');
    if (key !== this.decisionKey) {
      this.decisionKey = key;
      this.selectedShares = {};
      this.buyError = undefined;
      this.tieSelection = {};
      this.mergerShares = { sell: 0, trade: 0 };
      this.mergerError = undefined;
      this.dispatchDefaultAction = true;
    }
  }

  protected override updated() {
    if (!this.dispatchDefaultAction) return;
    this.dispatchDefaultAction = false;
    const view = this.playerView;
    // Keeping every share, or buying none, is a valid choice, so it's ready to submit without changes
    if (
      view?.currentPhase === GamePhase.RESOLVE_MERGER &&
      view.pendingMergePlayer === view.playerId
    ) {
      this.handleMergerShares(this.mergerShares);
    } else if (
      view?.currentPhase === GamePhase.BUY_SHARES && view.currentPlayer === view.playerId
    ) {
      this.dispatchPurchase();
    }
  }

  private dispatchPurchase() {
    this.setAction({
      type: ActionTypes.BUY_SHARES,
      payload: {
        player: this.user || '',
        shares: this.selectedShares as Record<HOTEL_NAME, number>,
      },
    });
  }

  private handleShareChange(hotel: HOTEL_NAME, count: number) {
    const view = this.playerView;
    if (!view) return;
    const { selection, error } = updateShareSelection(
      this.selectedShares,
      hotel,
      count,
      buyableHotels(view),
      view.money,
    );
    this.selectedShares = selection;
    this.buyError = error;
    this.dispatchPurchase();
  }

  private handleTieSelection(selection: TieSelection) {
    const view = this.playerView;
    if (!view) return;
    this.tieSelection = selection;
    const { survivor, merged } = completeTieSelection(
      view.mergerTieContext?.tiedHotels ?? [],
      view.mergeContext?.survivingHotel,
      selection,
    );
    this.setAction(
      survivor && merged
        ? {
          type: ActionTypes.BREAK_MERGER_TIE,
          payload: { player: this.user || '', resolvedTie: { survivor, merged } },
        }
        : null,
    );
  }

  private handleMergerShares(next: MergerShares) {
    const limits = this.playerView && mergerLimits(this.playerView);
    if (!limits) return;
    const { shares, error } = updateMergerShares(this.mergerShares, next, limits);
    this.mergerShares = shares;
    this.mergerError = error;
    this.setAction({
      type: ActionTypes.RESOLVE_MERGER,
      payload: { player: this.user || '', shares },
    });
  }

  private getActionTemplate() {
    switch (this.playerView?.currentPhase) {
      case GamePhase.FOUND_HOTEL:
        return foundHotelTemplate(
          this.playerView.foundHotelContext?.availableHotels || [],
          this.user || '',
          this,
        );
      case GamePhase.BUY_SHARES:
        return buyStocksTemplate(
          this.playerView,
          this.selectedShares,
          this.buyError,
          (hotel, count) => this.handleShareChange(hotel, count),
        );
      case GamePhase.BREAK_MERGER_TIE:
        return breakMergerTieTemplate(
          this.playerView,
          this.tieSelection,
          (selection) => this.handleTieSelection(selection),
        );
      case GamePhase.RESOLVE_MERGER:
        return resolveMergerTemplate(
          this.playerView,
          this.mergerShares,
          this.mergerError,
          (shares) => this.handleMergerShares(shares),
        );
      case GamePhase.PLAY_TILE:
      default:
        return null;
    }
  }

  public override render() {
    return html`
      <div class="action-card">
        <div style="display: flex; flex-direction: column; align-items=flex-start">
          <div class="action-title"><strong>ACTION</strong></div>
          <div class="action-desc">
            ${this.playerView?.currentPhase}
          </div>
        </div>
        ${this.getActionTemplate()}
      </div>
    `;
  }
}
