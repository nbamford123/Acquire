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
  hotels: Hotel[],
  user: string,
  parent: LitElement,
  initialShares: Partial<Record<HOTEL_NAME, number>> = {},
) => {
  const currentShares: Partial<Record<HOTEL_NAME, number>> = { ...initialShares };
  const totalLimit = 3;
  const currentTotal = Object.values(currentShares).reduce((a, b) => a + b, 0);

  return html`
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
      ${hotels.map((hotel) => {
        const quantity = currentShares[hotel.name] || 0;
        const availableStocks = hotel.shares.length;
        const canIncrease = quantity < availableStocks && currentTotal < totalLimit;
        const canDecrease = quantity > 0;

        return html`
          <div
            style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border: 1px solid #ccc; padding: 1rem; border-radius: 4px;"
          >
            <div style="font-weight: bold;">${hotel.name}</div>
            <div style="font-size: 0.875rem; color: #666;">
              Available: ${availableStocks}
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button
                @click="${() => {
                  const updated = handleQuantityChange(
                    hotel.name,
                    quantity - 1,
                    currentShares,
                    totalLimit,
                  );
                  Object.assign(currentShares, updated);
                  parent.requestUpdate?.();
                }}"
                ?disabled="${!canDecrease}"
              >
                −
              </button>
              <input
                type="number"
                value="${quantity}"
                min="0"
                max="${Math.min(availableStocks, totalLimit)}"
                @change="${(evt: Event) => {
                  const input = evt.target as HTMLInputElement;
                  const newValue = Math.max(
                    0,
                    Math.min(
                      parseInt(input.value) || 0,
                      Math.min(availableStocks, totalLimit),
                    ),
                  );
                  const updated = handleQuantityChange(
                    hotel.name,
                    newValue,
                    currentShares,
                    totalLimit,
                  );
                  Object.assign(currentShares, updated);
                  parent.requestUpdate?.();
                }}"
                style="width: 3rem; text-align: center;"
                readonly
              />
              <button
                @click="${() => {
                  const updated = handleQuantityChange(
                    hotel.name,
                    quantity + 1,
                    currentShares,
                    totalLimit,
                  );
                  Object.assign(currentShares, updated);
                  parent.requestUpdate?.();
                }}"
                ?disabled="${!canIncrease}"
              >
                +
              </button>
            </div>
          </div>
        `;
      })}
    </div>
    <div style="margin-top: 1rem;">
      <div style="margin-bottom: 0.5rem;">Total stocks selected: ${currentTotal} / ${totalLimit}</div>
      <button
        @click="${() => handlePurchase(currentShares, user, parent)}"
        ?disabled="${currentTotal === 0}"
      >
        Purchase Stocks
      </button>
    </div>
  `;
};
