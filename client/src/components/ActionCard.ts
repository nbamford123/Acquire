import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { GamePhase, type HOTEL_NAME, type PlayerView } from '@acquire/engine/types';
import { StyledComponent } from './StyledComponent.ts';
import { foundHotelTemplate } from './foundHotelTemplate.ts';
import { buyStocksTemplate } from './buyStocksTemplate.ts';

@customElement('action-card')
export class ActionCard extends StyledComponent {
  static override properties = {
    playerView: { type: Object },
    user: { type: String },
    gameTurn: { type: Number },
    selectedShares: { state: true },
  };
  declare playerView: PlayerView | null;
  declare user: string | null;
  private selectedShares: Partial<Record<HOTEL_NAME, number>> = {};

  static override styles = [
    super.styles,
    css`
      :host {
        flex: 1;
      }
      .action-card {
        display: flex;
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
            (size > 0 && shares > 0)
              ? hotels.concat([{ name: name as HOTEL_NAME, shares, size }])
              : hotels,
          [] as { name: HOTEL_NAME; shares: number; size: number }[],
        );
        return buyStocksTemplate(hotels, this.user || '', this, this.selectedShares);
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
      <div class="action-card">
        <div style="display: flex; flex-direction: column; align-items="flex-start">
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
