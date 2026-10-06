import { css, html } from 'lit';

import { type HOTEL_NAME, hotelList, type PlayerView } from '@acquire/engine/types';
import { hotelChip, stepper } from './actionCardStyles.ts';

export const MAX_SHARES_PER_TURN = 3;

// Only hotels with a count above zero, since the engine rejects zero counts
export type ShareSelection = Partial<Record<HOTEL_NAME, number>>;

export interface BuyableHotel {
  name: HOTEL_NAME;
  available: number; // shares left in the bank
  price: number;
}

// Hotels on the board with shares left to buy
export const buyableHotels = (playerView: PlayerView): BuyableHotel[] =>
  hotelList(playerView.hotels)
    .filter(({ shares, size }) => size > 0 && shares > 0)
    .map(({ name, shares, price }) => ({ name, available: shares, price }));

const countOf = (selection: ShareSelection) =>
  Object.values(selection).reduce((total, count) => total + (count ?? 0), 0);

export const selectionCost = (selection: ShareSelection, hotels: BuyableHotel[]) =>
  hotels.reduce((total, { name, price }) => total + (selection[name] ?? 0) * price, 0);

// Returns the next selection, or the current one and an error if the change isn't allowed
export const updateShareSelection = (
  current: ShareSelection,
  hotel: HOTEL_NAME,
  count: number,
  hotels: BuyableHotel[],
  cash: number,
): { selection: ShareSelection; error?: string } => {
  const target = hotels.find(({ name }) => name === hotel);
  if (!target || count < 0) return { selection: current };
  const selection = { ...current, [hotel]: count };
  if (!count) delete selection[hotel];
  if (countOf(selection) > MAX_SHARES_PER_TURN) {
    return { selection: current, error: `You can buy up to ${MAX_SHARES_PER_TURN} shares a turn.` };
  }
  if (count > target.available) {
    return { selection: current, error: `Only ${target.available} ${hotel} shares are left.` };
  }
  const cost = selectionCost(selection, hotels);
  if (cost > cash) {
    return { selection: current, error: `That costs $${cost} and you have $${cash}.` };
  }
  return { selection };
};

// Added to the action card's styles
export const buyStocksStyles = css`
  .picker-row.buy-hotels {
    gap: 1rem;
  }

  .picker-row.buy-hotel {
    gap: 0.35rem;
  }
`;

export const buyStocksTemplate = (
  playerView: PlayerView,
  selection: ShareSelection,
  error: string | undefined,
  onChange: (hotel: HOTEL_NAME, count: number) => void,
) => {
  if (playerView.currentPlayer !== playerView.playerId) {
    const name = playerView.players[playerView.currentPlayer]?.name;
    return html`
      <div class="picker">
        <p class="picker-prompt">Waiting for ${name} to buy shares</p>
      </div>
    `;
  }

  const hotels = buyableHotels(playerView);
  if (!hotels.length) {
    return html`
      <div class="picker">
        <p class="picker-prompt">No shares are available to buy</p>
      </div>
    `;
  }
  const count = countOf(selection);
  const cost = selectionCost(selection, hotels);
  return html`
    <div class="picker">
      <div class="picker-row buy-hotels">
        ${hotels.map(({ name, price }) =>
          html`
            <div class="picker-row buy-hotel">
              ${hotelChip(name, `$${price}`)} ${stepper(
                name,
                selection[name] ?? 0,
                1,
                (next) => onChange(name, next),
                false,
              )}
            </div>
          `
        )}
      </div>
      <p class="picker-summary">
        ${count
          ? `${count} of ${MAX_SHARES_PER_TURN} shares for $${cost}, leaving you $${
            playerView.money - cost
          }.`
          : `You can buy up to ${MAX_SHARES_PER_TURN} shares, or skip buying this turn.`}
      </p>
      ${error
        ? html`
          <p class="picker-error" role="alert">${error}</p>
        `
        : null}
    </div>
  `;
};
