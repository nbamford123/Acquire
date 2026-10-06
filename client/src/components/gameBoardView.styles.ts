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
    display: block;
    width: 100%;
    padding-block: 1rem;
  }

  /* Portrait: one column in reading order. Landscape, below, puts the board beside the rest. */
  .game-container {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'heading' 'log' 'board' 'controls' 'players' 'bank';
    gap: 1rem;
    align-items: start;
    max-width: 48rem;
    margin: 0 auto;
  }

  .game-heading {
    grid-area: heading;
  }

  .game-heading h2 {
    margin-bottom: 0.25rem;
  }

  .game-log {
    grid-area: log;
  }

  .game-board {
    grid-area: board;
  }

  .current-player-view {
    grid-area: controls;
  }

  .players-sidebar {
    grid-area: players;
  }

  .bank-section {
    grid-area: bank;
  }

  /* Landscape: the board fits the screen's height and stays in view on the left, with your move,
    the players, and the bank beside it. 6rem leaves room for the header and padding, since a
    board's height is three quarters of its width, and 25rem leaves room for six tiles beside it. */
  @media (orientation: landscape) and (min-width: 600px) {
    .game-container {
      --board-size: min(calc((100dvh - 6rem) * 4 / 3), calc(100vw - 25rem));
      grid-template-columns: var(--board-size) minmax(18rem, 1fr);
      grid-template-areas: 'board heading' 'board controls' 'board players' 'board log' 'board bank';
      max-width: none;
    }

    .game-board {
      position: sticky;
      top: 1rem;
    }
  }

  /* Wide enough for the bank in a column of its own without shrinking the board */
  @media (orientation: landscape) and (min-width: 1600px) {
    .game-container {
      --board-size: min(calc((100dvh - 6rem) * 4 / 3), calc(100vw - 42rem), 60rem);
      grid-template-columns: var(--board-size) minmax(18rem, 1fr) minmax(16rem, 20rem);
      grid-template-areas: 'board heading bank' 'board controls bank' 'board players bank'
        'board log bank';
    }
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
    padding: 0.75rem;
    border-radius: 8px;
    width: 100%;
    /* Cell labels scale with the board's width */
    container-type: inline-size;
  }

  /* Empty squares are recessed and placed tiles raised; the shadows are set per theme */
  .board-cell {
    background: var(--pico-card-background-color);
    border: 2px solid transparent;
    box-shadow: var(--slot-shadow);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    /* About a quarter of a cell, whatever the board's size */
    font-size: clamp(0.5rem, 2.2cqi, 0.85rem);
    font-weight: 600;
    /* Square cells size the board; a fixed board aspect ratio let rows overflow when narrow */
    aspect-ratio: 1;
  }

  /* A founded hotel's icon, above the tile's label; it scales with the board like the label */
  .cell-icon {
    font-size: clamp(0.65rem, 3.2cqi, 1.5rem);
    margin-bottom: 0.15em;
  }

  /* Tiles in a hotel take its color; others use Pico's primary */
  .board-cell.placed {
    background: var(--hotel, var(--pico-primary-background));
    color: var(--hotel-text, var(--pico-primary-inverse));
    border-color: var(--hotel, var(--pico-primary-background));
    box-shadow: var(--tile-shadow);
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

  /* Can shrink, so the tiles wrap in a narrow column */
  .tile-hand {
    flex: 0 1 auto;
    min-width: 0;
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
    box-shadow: var(--tile-shadow);
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
    box-shadow: var(--tile-shadow), 0 8px 12px rgb(0 0 0 / 0.25);
  }

  /* Pico draws the focus ring with box-shadow too, so keep it alongside the tile's */
  .tile:focus-visible {
    box-shadow: var(--tile-shadow), 0 0 0 var(--pico-outline-width) var(--pico-primary-focus);
  }

  .bank-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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

  .hotel-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0 0.5rem;
  }

  .hotel-row + .hotel-row {
    margin-top: 0.15rem;
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

  .hotel-tier,
  .hotel-bonuses {
    font-size: 0.8rem;
  }

  .hotel-tier {
    margin-left: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .players-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
  /* Short screens, like a phone in landscape: smaller type and spacing, so your move fits beside
    the board without scrolling. The action card is inside the board, so its text is set here. */
  @media (max-height: 500px) {
    .game-heading h2 {
      font-size: 1.25rem;
      margin-bottom: 0;
    }

    .game-status {
      font-size: 1rem;
    }

    .current-player-view {
      padding: 0.5rem 0.75rem;
      gap: 0.5rem 0.75rem;
    }

    .tiles-title,
    .action-title {
      margin-bottom: 0.25rem;
    }

    .action-desc {
      font-size: 1.1rem;
    }

    .current-player-view > button {
      padding-block: 0.4rem;
    }
  }

  /* Phones: tighter spacing */
  @media (max-width: 576px) {
    .game-board {
      padding: 0.5rem;
      gap: 2px;
    }

    .bank-card,
    .player-card,
    .current-player-view {
      padding: 0.75rem;
    }

    .bank-card h3 {
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
  }
`;
