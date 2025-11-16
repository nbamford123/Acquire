import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import {
  ActionTypes,
  type GameAction,
  type HOTEL_NAME,
  type PlayerView,
} from '@acquire/engine/types';
import { getHotelPrice } from '@acquire/engine/utils';

import { StyledComponent } from './StyledComponent.ts';

@customElement('buystocks-panel')
export class BuyStocksPanel extends StyledComponent {
  static override properties = {
    hotels: { type: Object },
    user: { type: String },
    playerMoney: { type: Number },
  };
  private hotels: { name: HOTEL_NAME; shares: number; size: number }[] = [];
  private user: string = '';
  private playerMoney: number = 0;

  private selectedStocks: Record<string, number> = {};

  static override styles = [
    super.styles,
    css`
      :host {
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }

      .player-money {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .money-label {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 4px;
      }

      .money-amount {
        font-size: 32px;
        font-weight: bold;
      }

      .hotels-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .hotel-card {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s ease;
      }

      .hotel-card:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      .hotel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .hotel-name {
        font-size: 20px;
        font-weight: 600;
        color: #1f2937;
      }

      .stock-price {
        font-size: 18px;
        font-weight: bold;
        color: #667eea;
      }

      .stock-selector {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .selector-label {
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
      }

      .quantity-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f3f4f6;
        border-radius: 8px;
        padding: 4px;
      }

      .qty-btn {
        width: 36px;
        height: 36px;
        border: none;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        color: #667eea;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .qty-btn:hover:not(:disabled) {
        background: #667eea;
        color: white;
        transform: scale(1.05);
      }

      .qty-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .qty-display {
        min-width: 40px;
        text-align: center;
        font-size: 18px;
        font-weight: bold;
        color: #1f2937;
      }

      .cost-display {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .cost-label {
        font-size: 14px;
        color: #6b7280;
      }

      .cost-amount {
        font-size: 16px;
        font-weight: bold;
        color: #1f2937;
      }

      .total-section {
        margin-top: 24px;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .total-label {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }

      .total-amount {
        font-size: 24px;
        font-weight: bold;
        color: #667eea;
      }

      .remaining-money {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
      }

      .remaining-label {
        font-size: 14px;
        color: #6b7280;
      }

      .remaining-amount {
        font-size: 16px;
        font-weight: 600;
      }

      .remaining-amount.positive {
        color: #10b981;
      }

      .remaining-amount.negative {
        color: #ef4444;
      }

      .buy-button {
        width: 100%;
        margin-top: 16px;
        padding: 16px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .buy-button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }

      .buy-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
    `,
  ];

  private updateQuantity(hotel: string, delta: number) {
    // TODO(me): only allow buying as many stocks as available
    const current = this.selectedStocks[hotel] || 0;
    const newValue = Math.max(0, Math.min(3, current + delta));

    this.selectedStocks = {
      ...this.selectedStocks,
      [hotel]: newValue,
    };
    this.requestUpdate();
  }

  private getTotalCost() {
    return this.hotels
      ? this.hotels.reduce((total, { name, size }) => {
        const price = getHotelPrice(name, size).price;
        const quantity = this.selectedStocks[name] || 0;
        return total + (price * quantity);
      }, 0)
      : 0;
  }

  getRemainingMoney() {
    return (this.playerMoney || 0) - this.getTotalCost();
  }

  canAfford(hotelName: string, quantity: number) {
    const hotel = this.hotels.find((h) => h.name === hotelName);
    const currentQuantity = this.selectedStocks[hotelName] || 0;
    const price = hotel ? getHotelPrice(hotel.name, hotel.size).price : 0;
    const additionalCost = price * (quantity - currentQuantity);
    return this.getRemainingMoney() >= additionalCost;
  }

  handlePurchase() {
    const totalCost = this.getTotalCost();
    if (totalCost > 0 && totalCost <= (this.playerMoney || 0)) {
      this.dispatchEvent(
        new CustomEvent('purchase', {
          detail: {
            stocks: this.selectedStocks,
            totalCost: totalCost,
          },
        }),
      );
    }
  }

  public override render() {
    const totalCost = this.getTotalCost();
    const remainingMoney = this.getRemainingMoney();
    const hasSelection = totalCost > 0;
    const canPurchase = hasSelection && remainingMoney >= 0;

    return html`
      <div class="container">
        <div class="player-money">
          <div class="money-label">Available Funds</div>
          <div class="money-amount">$${this.playerMoney?.toLocaleString()}</div>
        </div>

        <div class="hotels-list">
          ${this.hotels.map(({ name, shares, size }) => {
            const price = getHotelPrice(name as HOTEL_NAME, size).price;
            const quantity = this.selectedStocks[name] || 0;
            const cost = price * quantity;
            const canIncrease = quantity < 3 && this.canAfford(name, quantity + 1);

            return html`
              <div class="hotel-card">
                <div class="hotel-header">
                  <div class="hotel-name">${name}</div>
                  <div class="stock-price">$${price}</div>
                </div>

                <div class="stock-selector">
                  <div class="selector-label">Quantity:</div>
                  <div class="quantity-controls">
                    <button
                      class="qty-btn"
                      @click="${() => this.updateQuantity(name, -1)}"
                      ?disabled="${quantity === 0}"
                    >
                      −
                    </button>
                    <div class="qty-display">${quantity}</div>
                    <button
                      class="qty-btn"
                      @click="${() => this.updateQuantity(name, 1)}"
                      ?disabled="${!canIncrease}"
                    >
                      +
                    </button>
                  </div>
                </div>

                ${quantity > 0
                  ? html`
                    <div class="cost-display">
                      <div class="cost-label">Subtotal</div>
                      <div class="cost-amount">$${cost.toLocaleString()}</div>
                    </div>
                  `
                  : ''}
              </div>
            `;
          })}
        </div>

        ${hasSelection
          ? html`
            <div class="total-section">
              <div class="total-row">
                <div class="total-label">Total Cost</div>
                <div class="total-amount">$${totalCost.toLocaleString()}</div>
              </div>
              <div class="remaining-money">
                <div class="remaining-label">Remaining Funds</div>
                <div class="remaining-amount ${remainingMoney >= 0 ? 'positive' : 'negative'}">
                  $${remainingMoney.toLocaleString()}
                </div>
              </div>
              <button
                class="buy-button"
                @click="${this.handlePurchase}"
                ?disabled="${!canPurchase}"
              >
                ${canPurchase ? 'Purchase Stocks' : 'Insufficient Funds'}
              </button>
            </div>
          `
          : ''}
      </div>
    `;
  }
}
