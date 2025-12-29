import { html, type LitElement } from 'lit';

import { ActionTypes, type GameAction, type HOTEL_NAME } from '@acquire/engine/types';

const handleHotelSelect = (
  hotel: HOTEL_NAME,
  user: string,
  parent: LitElement,
) => {
  const action: GameAction = {
    type: ActionTypes.FOUND_HOTEL,
    payload: { player: user || '', hotelName: hotel },
  };
  parent.dispatchEvent(
    new CustomEvent('set-action', {
      detail: action,
      bubbles: true,
      composed: true,
    }),
  );
};

export const foundHotelTemplate = (
  hotels: HOTEL_NAME[],
  user: string,
  parent: LitElement,
) =>
  html`
    <select style="flex: 1; max-width: 10rem; margin-bottom: 0;" name="selecthotel" @change="${(evt: Event) =>
      handleHotelSelect(
        (evt.target as HTMLSelectElement)?.value as HOTEL_NAME,
        user,
        parent,
      )}">
      <option value="">Select hotel...</option>
      ${hotels
        .map((hotel) =>
          html`
            <option value="${hotel}">${hotel}</option>
          `
        )}
    </select>
  `;
