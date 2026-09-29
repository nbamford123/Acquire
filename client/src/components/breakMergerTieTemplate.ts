import { html } from 'lit';

import type { HOTEL_NAME, PlayerView } from '@acquire/engine/types';
import { hotelChip } from './actionCardStyles.ts';

export interface TieSelection {
  survivor?: HOTEL_NAME;
  merged?: HOTEL_NAME;
}

// Fill in whatever the player doesn't need to pick: the survivor when it was already decided, and
// the merged hotel when only one other hotel is tied
export const completeTieSelection = (
  tiedHotels: HOTEL_NAME[],
  survivingHotel: HOTEL_NAME | undefined,
  selection: TieSelection,
): TieSelection => {
  if (survivingHotel) {
    return { survivor: survivingHotel, merged: selection.merged };
  }
  const { survivor } = selection;
  const others = tiedHotels.filter((hotel) => hotel !== survivor);
  const merged = survivor && others.length === 1 ? others[0] : selection.merged;
  return { survivor, merged: merged !== survivor ? merged : undefined };
};

const hotelOptions = (
  hotels: HOTEL_NAME[],
  selected: HOTEL_NAME | undefined,
  playerView: PlayerView,
  onPick: (hotel: HOTEL_NAME) => void,
) =>
  html`
    <div class="picker-row">
      ${hotels.map((hotel) =>
        html`
          <button
            class="hotel-option ${hotel === selected ? 'selected' : ''}"
            aria-pressed="${hotel === selected}"
            @click="${() => onPick(hotel)}"
          >
            ${hotelChip(hotel, `size ${playerView.hotels[hotel]?.size ?? 0}`)}
          </button>
        `
      )}
    </div>
  `;

export const breakMergerTieTemplate = (
  playerView: PlayerView,
  selection: TieSelection,
  onSelect: (selection: TieSelection) => void,
) => {
  const tiedHotels = playerView.mergerTieContext?.tiedHotels ?? [];
  const survivingHotel = playerView.mergeContext?.survivingHotel;

  if (playerView.currentPlayer !== playerView.playerId) {
    const name = playerView.players[playerView.currentPlayer]?.name;
    return html`
      <div class="picker">
        <p class="picker-prompt">Waiting for ${name} to break the tie</p>
        <div class="picker-row">${tiedHotels.map((hotel) => hotelChip(hotel))}</div>
      </div>
    `;
  }

  const { survivor, merged } = completeTieSelection(tiedHotels, survivingHotel, selection);
  return html`
    <div class="picker">
      ${survivingHotel
        ? html`
          <p class="picker-prompt">
            ${survivingHotel} survives. Pick which hotel merges into it first
          </p>
          ${hotelOptions(
            tiedHotels,
            merged,
            playerView,
            (hotel) => onSelect({ merged: hotel }),
          )}
        `
        : html`
          <p class="picker-prompt">Pick the surviving hotel</p>
          ${hotelOptions(
            tiedHotels,
            survivor,
            playerView,
            (hotel) => onSelect({ survivor: hotel }),
          )} ${survivor && tiedHotels.length > 2
            ? html`
              <p class="picker-prompt">Pick which hotel merges into ${survivor} first</p>
              ${hotelOptions(
                tiedHotels.filter((hotel) => hotel !== survivor),
                merged,
                playerView,
                (hotel) => onSelect({ survivor, merged: hotel }),
              )}
            `
            : null}
        `}
      <p class="picker-summary">
        ${survivor && merged
          ? `${merged} merges into ${survivor}. ${merged} stockholders get their bonuses, then each sells, trades, or keeps their shares.`
          : 'Select a hotel to see the result.'}
      </p>
    </div>
  `;
};
