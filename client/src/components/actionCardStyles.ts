import { css, html } from 'lit';

import type { HOTEL_NAME } from '@acquire/engine/types';
import { hotelIcons } from './gameBoardView.styles.ts';

export const hotelChip = (hotel: HOTEL_NAME, detail?: string) =>
  html`
    <span class="hotel-chip ${hotel.toLocaleLowerCase()}">
      ${hotelIcons[hotel]} ${hotel}${detail
        ? html`
          <span class="chip-detail">${detail}</span>
        `
        : null}
    </span>
  `;

// Number picker; label is shown next to it unless showLabel is false (it's always the aria name)
export const stepper = (
  label: string,
  value: number,
  step: number,
  onChange: (value: number) => void,
  showLabel = true,
) =>
  html`
    <div class="stepper">
      ${showLabel
        ? html`
          <span>${label}</span>
        `
        : null}
      <button
        class="outline secondary"
        aria-label="${label} fewer"
        @click="${() => onChange(value - step)}"
      >
        −
      </button>
      <span class="stepper-value">${value}</span>
      <button
        class="outline secondary"
        aria-label="${label} more"
        @click="${() => onChange(value + step)}"
      >
        +
      </button>
    </div>
  `;

// Styles shared by the action card templates
export const actionCardStyles = css`
  .picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    /* Wraps under the action title rather than squeezing */
    flex: 1 1 16rem;
    min-width: 0;
  }

  .picker-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .picker-prompt {
    font-size: 0.9rem;
    margin: 0;
  }

  .picker-summary {
    font-size: 0.85rem;
    color: var(--pico-muted-color);
    margin: 0;
  }

  .picker-error {
    font-size: 0.85rem;
    color: var(--pico-del-color);
    margin: 0;
  }

  .hotel-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    border: 2px solid;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .chip-detail {
    font-weight: 400;
    color: var(--pico-muted-color);
  }

  .hotel-chip.tower {
    border-color: var(--pico-color-yellow-100);
    background: var(--pico-color-yellow-800);
  }
  .hotel-chip.luxor {
    border-color: var(--pico-color-red-500);
    background: var(--pico-color-red-800);
  }
  .hotel-chip.american {
    border-color: var(--pico-color-blue-500);
    background: var(--pico-color-blue-800);
  }
  .hotel-chip.worldwide {
    border-color: var(--pico-color-sand-500);
    background: var(--pico-color-sand-800);
  }
  .hotel-chip.festival {
    border-color: var(--pico-color-green-500);
    background: var(--pico-color-green-800);
  }
  .hotel-chip.imperial {
    border-color: var(--pico-color-pink-500);
    background: var(--pico-color-pink-800);
  }
  .hotel-chip.continental {
    border-color: var(--pico-color-azure-500);
    background: var(--pico-color-azure-800);
  }

  .hotel-option {
    margin: 0;
    padding: 0.25rem;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
  }

  .hotel-option.selected {
    border-color: var(--pico-primary);
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .stepper button {
    margin: 0;
    width: 2rem;
    height: 2rem;
    padding: 0;
    line-height: 1;
  }

  .stepper-value {
    min-width: 1.5rem;
    text-align: center;
    font-weight: 600;
  }

  .small-button {
    margin: 0;
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
  }

  .queue-player {
    padding: 0.1rem 0.5rem;
    border-radius: 6px;
    font-size: 0.85rem;
    border: 1px solid var(--pico-muted-border-color);
  }

  .queue-player.active {
    border-color: var(--pico-primary);
    color: var(--pico-primary);
    font-weight: 600;
  }
`;
