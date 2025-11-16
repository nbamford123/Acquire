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
    <select @change="${(evt: Event) =>
      handleHotelSelect(
        (evt.target as HTMLSelectElement)?.value as HOTEL_NAME,
        user,
        parent,
      )}">${hotels
      .map((hotel) =>
        html`
          <option value="${hotel}">${hotel}</option>
        `
      )}</select>
  `;
