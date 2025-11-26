import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { GamePhase, type PlayerView } from '@acquire/engine/types';
import { StyledComponent } from './StyledComponent.ts';
import { foundHotelTemplate } from './foundHotelTemplate.ts';
import './BuyStocksPanel.ts';

@customElement('action-card')
export class ActionCard extends StyledComponent {
  static override properties = {
    playerView: { type: Object },
    user: { type: String },
    gameTurn: { type: Number },
  };
  declare playerView: PlayerView | null;
  declare user: string | null;

  static override styles = [
    super.styles,
    css`
      .action-card {
        display: flex;
        font-size: 1rem;
        padding: 1rem;
        background: var(--pico-card-background-color);
        border-radius: 8px;
        border: 2px solid var(--pico-primary);
        justify-content: space-between;
      }
      .current-action {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
    `,
  ];

  public constructor() {
    super();
    this.playerView = null;
    this.user = null;
  }
  private getActionTemplate() {
    switch (this.playerView?.currentPhase) {
      case GamePhase.FOUND_HOTEL:
        return foundHotelTemplate(
          this.playerView.foundHotelContext?.availableHotels || [],
          this.user || '',
          this,
        );
      case GamePhase.BUY_SHARES: {
        const hotels = Object.entries(this.playerView.hotels).reduce(
          (hotels, [name, { shares, size }]) =>
            size > 0 ? hotels.concat([{ name, shares, size }]) : hotels,
          [] as { name: string; shares: number; size: number }[],
        );
        // TODO(me): will current player always be right here? What about when we rotate around to someone who isn't the current player?
        return html`
          <buystocks-panel .hotels="${hotels}" user="${this
            .user}" playerMoney="${this.playerView.money}">
          </buystocks-panel>
        `;
      }
      case GamePhase.PLAY_TILE:
      case GamePhase.RESOLVE_MERGER:
      case GamePhase.BREAK_MERGER_TIE:
      default:
        return null;
    }
  }

  public override render() {
    return html`
      <article class="action-card">
        <div class="current-action">
          <span style="font-size: .75rem"><strong>ACTION</strong></span> ${this.playerView
            ?.currentPhase}
        </div>
        ${this.getActionTemplate()}
      </article>
    `;
  }
}
