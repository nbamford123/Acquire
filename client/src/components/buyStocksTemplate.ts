import { html, type LitElement } from 'lit';

import { ActionTypes, type GameAction, type Hotel, type HOTEL_NAME } from '@acquire/engine/types';

const handlePurchase = (
  shares: Partial<Record<HOTEL_NAME, number>>,
  user: string,
  parent: LitElement,
) => {
  const action: GameAction = {
    type: ActionTypes.BUY_SHARES,
    payload: { player: user || '', shares: shares as Record<HOTEL_NAME, number> },
  };
  parent.dispatchEvent(
    new CustomEvent('set-action', {
      detail: action,
      bubbles: true,
      composed: true,
    }),
  );
};

const handleQuantityChange = (
  hotelName: HOTEL_NAME,
  newQuantity: number,
  currentShares: Partial<Record<HOTEL_NAME, number>>,
  totalLimit: number,
) => {
  const currentTotal = Object.values(currentShares).reduce((a, b) => (a || 0) + (b || 0), 0);
  const currentQuantity = currentShares[hotelName] || 0;
  const difference = newQuantity - currentQuantity;

  // Check if adding this quantity would exceed the total limit
  if (currentTotal + difference > totalLimit) {
    return currentShares;
  }

  // Don't allow negative quantities
  if (newQuantity < 0) {
    return currentShares;
  }

  return {
    ...currentShares,
    [hotelName]: newQuantity,
  };
};

export const buyStocksTemplate = (
  hotels: { name: HOTEL_NAME; shares: number; size: number }[],
  user: string,
  parent: LitElement,
  initialShares: Partial<Record<HOTEL_NAME, number>> = {},
) => {
  // Use the passed `initialShares` object directly so mutations persist
  const currentShares: Partial<Record<HOTEL_NAME, number>> = initialShares || {};
  const totalLimit = 3;
  const currentTotal = Object.values(currentShares).reduce((a, b) => a + b, 0);
  return html`
    <div style="display: flex; gap: 8px;">
      ${hotels.map((hotel) => {
        const quantity = currentShares[hotel.name] || 0;
        const availableStocks = hotel.shares;
        const canIncrease = quantity < availableStocks && currentTotal < totalLimit;
        return html`
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 13px;">${hotel.name}:</span>
            <input
              @change="${(e: Event) => {
                const updated = handleQuantityChange(
                  hotel.name,
                  Number((e.target as HTMLInputElement).value),
                  currentShares,
                  totalLimit,
                );
                Object.assign(currentShares, updated);
                const action: GameAction = {
                  type: ActionTypes.BUY_SHARES,
                  payload: {
                    player: user || '',
                    shares: currentShares as Record<HOTEL_NAME, number>,
                  },
                };
                parent.dispatchEvent(
                  new CustomEvent('set-action', {
                    detail: action,
                    bubbles: true,
                    composed: true,
                  }),
                );
                parent.requestUpdate?.();
              }}"
              type="number"
              min="0"
              max="3"
              defaultValue="0"
              style="margin-bottom: 0; width: 50px; padding: 6px; background: #0f3460; color: #eee; border: 1px solid #4ECDC4; borderRadius: 4px;"
            />
          </div>
        `;
      })}
    </div>
  `;
};
