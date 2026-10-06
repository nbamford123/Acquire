import { css, html } from 'lit';

import type { HOTEL_NAME, PlayerView } from '@acquire/engine/types';
import { getHotelPrice } from '@acquire/engine/utils';
import { hotelChip, stepper } from './actionCardStyles.ts';

export interface MergerShares {
  sell: number;
  trade: number;
}

export interface MergerLimits {
  merged: HOTEL_NAME;
  survivor: HOTEL_NAME;
  held: number; // merged hotel shares this player holds
  survivorAvailable: number; // survivor shares left in the bank to trade for
}

const shareCount = (count: number, hotel: HOTEL_NAME) =>
  `${count} ${hotel} ${count === 1 ? 'share' : 'shares'}`;

// Returns the next share selection, or the current one and an error if the change isn't allowed
export const updateMergerShares = (
  current: MergerShares,
  next: MergerShares,
  { merged, survivor, held, survivorAvailable }: MergerLimits,
): { shares: MergerShares; error?: string } => {
  if (next.sell < 0 || next.trade < 0) {
    return { shares: current };
  }
  if (next.sell + next.trade > held) {
    return { shares: current, error: `You only have ${shareCount(held, merged)}.` };
  }
  if (next.trade / 2 > survivorAvailable) {
    return {
      shares: current,
      error: `Only ${shareCount(survivorAvailable, survivor)} left to trade for.`,
    };
  }
  return { shares: next };
};

export const mergerLimits = (playerView: PlayerView): MergerLimits | undefined => {
  const { mergedHotel, survivingHotel } = playerView.mergeContext ?? {};
  if (!mergedHotel || !survivingHotel) return undefined;
  return {
    merged: mergedHotel,
    survivor: survivingHotel,
    held: playerView.stocks[mergedHotel] ?? 0,
    survivorAvailable: playerView.hotels[survivingHotel]?.shares ?? 0,
  };
};

export const mergerSummary = (
  { sell, trade }: MergerShares,
  limits: MergerLimits,
  price: number,
) => {
  const results = [];
  if (sell) results.push(`sell ${shareCount(sell, limits.merged)} for $${sell * price}`);
  if (trade) {
    results.push(
      `trade ${shareCount(trade, limits.merged)} for ${shareCount(trade / 2, limits.survivor)}`,
    );
  }
  const kept = limits.held - sell - trade;
  if (kept || !results.length) results.push(`keep ${shareCount(kept, limits.merged)}`);
  const last = results.pop();
  return `You'll ${results.length ? `${results.join(', ')} and ${last}` : last}.`;
};

const mergeHeader = (playerView: PlayerView, limits: MergerLimits) =>
  html`
    <div class="picker-row">
      ${hotelChip(limits.merged, `size ${playerView.mergeContext?.mergedHotelSize ?? 0}`)}
      <span class="picker-summary">merges into</span>
      ${hotelChip(limits.survivor, `size ${playerView.hotels[limits.survivor]?.size ?? 0}`)}
    </div>
  `;

// Added to the action card's styles
export const resolveMergerStyles = css`
  .picker-row.merger-heading {
    justify-content: space-between;
  }

  .picker-row.merger-steppers {
    gap: 1.25rem;
  }
`;

export const resolveMergerTemplate = (
  playerView: PlayerView,
  shares: MergerShares,
  error: string | undefined,
  onChange: (shares: MergerShares) => void,
) => {
  const limits = mergerLimits(playerView);
  if (!limits) return null;
  const stockholderIds = playerView.mergeContext?.stockholderIds ?? [];

  if (playerView.pendingMergePlayer !== playerView.playerId) {
    const activeName = playerView.players[playerView.pendingMergePlayer ?? -1]?.name;
    return html`
      <div class="picker">
        ${mergeHeader(playerView, limits)}
        <p class="picker-prompt">
          Waiting for ${activeName} to sell, trade, or keep their ${limits.merged} shares
        </p>
        <div class="picker-row">
          <span class="picker-summary">Stockholders left:</span>
          ${stockholderIds.map((id, index) =>
            html`
              <span class="queue-player ${index === 0 ? 'active' : ''}">
                ${playerView.players[id]?.name}
              </span>
            `
          )}
        </div>
      </div>
    `;
  }

  const price = getHotelPrice(limits.merged, playerView.mergeContext?.mergedHotelSize ?? 0).price;
  return html`
    <div class="picker">
      <div class="picker-row merger-heading">
        ${mergeHeader(playerView, limits)}
        <span class="picker-summary">
          You hold ${shareCount(limits.held, limits.merged)}, selling at $${price} each
        </span>
      </div>
      <div class="picker-row merger-steppers">
        ${stepper('Sell', shares.sell, 1, (sell) => onChange({ ...shares, sell }))}
        ${stepper('Trade', shares.trade, 2, (trade) => onChange({ ...shares, trade }))}
        <div class="stepper">
          <span>Keep</span>
          <span class="stepper-value">${limits.held - shares.sell - shares.trade}</span>
        </div>
        <button
          class="outline secondary small-button"
          @click="${() => onChange({ sell: limits.held, trade: 0 })}"
        >
          Sell all
        </button>
      </div>
      <p class="picker-summary">${mergerSummary(shares, limits, price)} Trades are 2 for 1.</p>
      ${error
        ? html`
          <p class="picker-error" role="alert">${error}</p>
        `
        : null}
    </div>
  `;
};
