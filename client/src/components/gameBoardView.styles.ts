import { css } from 'lit';

export const hotelIcons: Record<string, string> = {
  'Tower': '♜',
  'Luxor': '🏛️',
  'Worldwide': '🌍',
  'American': '🦅',
  'Festival': '🎪',
  'Imperial': '👑',
  'Continental': '🗺️',
};

export const styles = css`
  & {
    align-self: stretch;
    display: block;
    padding: 1rem;
  }

  .game-container {
    display: grid;
    grid-template-columns: minmax(700px, 900px) 300px; /* Explicit sizes */
    grid-template-rows: auto auto;
    gap: 1rem;
    justify-content: center;
    margin: 0 auto;
  }

  .board-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    grid-row: 1 / 3;
    grid-column: 1;
  }

  .board-section h2 {
    margin-bottom: 0.25rem;
  }

  .game-status {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .game-status.your-move {
    color: var(--pico-primary);
  }

  .spectating {
    margin: 0;
    font-size: 0.875rem;
    color: var(--pico-muted-color);
  }

  .game-log {
    margin: 0;
  }

  .game-log ul {
    max-height: 12rem;
    overflow-y: auto;
    margin: 0;
    padding-left: 0;
    font-size: 0.875rem;
  }

  .game-log li {
    list-style: none;
  }

  /* One color per hotel, used by everything colored by hotel, including the action card inside
    the board. --hotel-text is readable on solid --hotel (WCAG AA); cards and chips use a tint of
    --hotel instead, so they follow the theme and keep Pico's text colors. */
  .tower {
    --hotel: var(--pico-color-yellow-200);
    --hotel-text: #13171f;
  }
  .luxor {
    --hotel: var(--pico-color-red-550);
    --hotel-text: #fff;
  }
  .american {
    --hotel: var(--pico-color-blue-600);
    --hotel-text: #fff;
  }
  .worldwide {
    --hotel: var(--pico-color-sand-550);
    --hotel-text: #fff;
  }
  .festival {
    --hotel: var(--pico-color-green-550);
    --hotel-text: #fff;
  }
  .imperial {
    --hotel: var(--pico-color-pink-550);
    --hotel-text: #fff;
  }
  .continental {
    --hotel: var(--pico-color-azure-600);
    --hotel-text: #fff;
  }
  .hotel-tint {
    border-color: var(--hotel);
    background: color-mix(in srgb, var(--hotel) 20%, var(--pico-card-background-color));
  }

  .game-board {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
    background: var(--pico-background-color);
    padding: 1rem;
    border-radius: 8px;
    width: 100%;
    margin: 0 auto;
  }

  .board-cell {
    background: var(--pico-card-background-color);
    border: 2px solid var(--pico-muted-border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    /* Square cells size the board; a fixed board aspect ratio let rows overflow when narrow */
    aspect-ratio: 1;
    min-height: 40px;
  }

  /* Tiles in a hotel take its color; others use Pico's primary */
  .board-cell.placed {
    background: var(--hotel, var(--pico-primary-background));
    color: var(--hotel-text, var(--pico-primary-inverse));
    border-color: var(--hotel, var(--pico-primary-background));
  }

  .current-player-view {
    border-radius: 8px;
    border: 2px solid var(--pico-primary);
    padding: 16px 20px;
    gap: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .current-player-view > button {
    white-space: nowrap;
  }

  .game-over {
    align-items: flex-start;
  }

  .game-over-summary {
    flex: 0 0 auto;
  }

  .game-over-headline {
    font-size: 1.5rem;
  }

  .standings {
    flex: 1;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .standings li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0;
    margin: 0;
    border-bottom: 1px solid var(--pico-muted-border-color);
    list-style: none;
  }

  .standings li:last-child {
    border-bottom: none;
  }

  .standings li.winner {
    font-weight: 700;
    color: var(--pico-primary);
  }

  .standing-money {
    font-variant-numeric: tabular-nums;
  }

  .tile-hand {
    flex: 0 0 auto;
  }

  .tiles-title {
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .tiles-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tile {
    padding: 0.5rem 0.75rem;
    background: var(--pico-secondary-background);
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    color: var(--pico-secondary-inverse);
  }

  .tile:disabled {
    opacity: 0.4;
    text-decoration: line-through;
    cursor: not-allowed;
  }

  /* tiles should not shift when selected */
  .tile:not(.selected):not(:disabled):hover {
    background: var(--pico-secondary-hover-background);
    transform: translateY(-2px);
  }

  .tile.selected {
    transform: translateY(-10px);
  }

  .bank-section {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    grid-row: 1;
    grid-column: 2;
  }

  .bank-card {
    padding: 1rem;
    margin: 0;
    background: var(--pico-card-background-color);
    border-radius: 8px;
    border: 1px solid var(--pico-muted-border-color);
  }

  .bank-card h3 {
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
  }

  .bank-cash {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--pico-primary);
    margin-bottom: 0.5rem;
  }

  .hotel-chain {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 6px;
    border: 2px solid;
  }

  .hotel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .hotel-name {
    font-weight: 700;
    font-size: 0.95rem;
  }

  /* Muted and primary colors aren't readable on every hotel tint, so these use the text color */
  .hotel-size {
    font-size: 0.85rem;
  }

  .hotel-stock {
    font-size: 0.85rem;
  }

  .hotel-price {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .players-sidebar {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    grid-row: 2;
    grid-column: 2;
  }

  .player-card {
    padding: 1rem;
    margin: 0;
    background: var(--pico-card-background-color);
    border-radius: 8px;
    border: 1px solid var(--pico-muted-border-color);
  }

  .player-card.active {
    border: 2px solid var(--pico-primary);
    background: color-mix(in srgb, var(--pico-primary) 10%, var(--pico-card-background-color));
  }

  .player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .player-name {
    font-weight: 700;
    font-size: 1rem;
    margin: 0;
  }

  .player-cash {
    color: var(--pico-primary);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .you-badge {
    margin-left: 0.4rem;
    padding: 0.05rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--pico-primary-inverse);
    background: var(--pico-primary-background);
    vertical-align: middle;
  }

  .holding-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    padding: 0.15rem 0;
  }

  .holding-total {
    margin-top: 0.35rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--pico-muted-border-color);
    font-weight: 600;
  }

  .holding-value {
    color: var(--pico-muted-color);
    font-weight: 400;
  }

  .hotel-dot {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    margin-right: 0.4rem;
    border-radius: 2px;
    background: var(--hotel);
  }

  .cash-meter {
    display: inline-flex;
    gap: 2px;
  }

  .cash-segment {
    width: 0.4rem;
    height: 0.8rem;
    border-radius: 1px;
    background: var(--pico-muted-border-color);
  }

  .cash-segment.filled {
    background: var(--pico-ins-color);
  }

  .share-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .share-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.5rem;
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .share-pips {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .share-pip {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: currentColor;
  }

  .player-stocks {
    font-size: 0.85rem;
    color: var(--pico-muted-color);
    margin-top: 0.5rem;
  }

  /* Laptop: 1200-1400px - Board minimum 600px */
  @media (max-width: 1400px) and (min-width: 1200px) {
    .game-board {
      min-width: 600px;
      max-width: 900px;
    }
  }

  /* Tablet: <1200px - Board spans full width above, bank and players side-by-side below */
  @media (max-width: 1200px) {
    & {
      padding: 1rem;
      width: 100%;
    }

    .game-container {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      max-width: 100%;
      width: 100%;
    }

    .board-section {
      width: 100%;
      grid-row: 1;
      grid-column: 1 / 3;
    }

    .game-board {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      margin: 0;
    }

    .bank-section {
      width: 100%;
      grid-row: 2;
      grid-column: 1;
      display: flex;
      flex-direction: column;
    }

    .players-sidebar {
      width: 100%;
      grid-row: 2;
      grid-column: 2;
      display: flex;
      flex-direction: column;
    }
  }

  /* Mobile: <768px - Everything stacks in single column */
  @media (max-width: 768px) {
    & {
      padding: 0.5rem;
    }

    /* Twelve 40px cells don't fit; let them shrink with the width */
    .board-cell {
      min-height: 0;
      font-size: 0.6rem;
    }

    .game-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      gap: 0.75rem;
    }

    .board-section {
      width: 100%;
      grid-row: 1;
      grid-column: 1;
      gap: 0.75rem;
    }

    .game-board {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      padding: 0.75rem;
      gap: 2px;
      margin: 0;
    }

    .bank-section {
      width: 100%;
      grid-row: 2;
      grid-column: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .bank-card {
      padding: 0.75rem;
    }

    .bank-card h3 {
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .players-sidebar {
      width: 100%;
      grid-row: 3;
      grid-column: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .player-card {
      padding: 0.75rem;
    }

    .player-header {
      margin-bottom: 0.25rem;
    }

    .current-player-view {
      padding: 0.75rem;
    }
  }
`;
