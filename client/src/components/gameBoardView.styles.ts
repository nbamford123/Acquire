import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    padding: 1rem;
  }

  .game-container {
    display: grid;
    grid-template-columns: 1fr auto 280px;
    gap: 1rem;
    max-width: 1600px;
    margin: 0 auto;
  }

  .board-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .game-board {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: repeat(9, 1fr);
    gap: 4px;
    background: var(--pico-background-color);
    padding: 1rem;
    border-radius: 8px;
    aspect-ratio: 12/9;
    max-width: 900px;
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
    cursor: pointer;
    transition: all 0.2s;
    min-height: 40px;
  }

  .board-cell:hover {
    background: var(--pico-primary-hover);
    border-color: var(--pico-primary);
    transform: scale(1.05);
  }

  .board-cell.placed {
    background: var(--pico-primary);
    color: white;
    border-color: var(--pico-primary);
  }

  .current-player-view {
    padding: 1rem;
    background: var(--pico-card-background-color);
    border-radius: 8px;
    border: 2px solid var(--pico-primary);
  }

  .current-player-view h3 {
    margin-top: 0;
    color: var(--pico-primary);
  }

  .tile-hand {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  .tile {
    padding: 0.5rem 0.75rem;
    background: var(--pico-secondary);
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    color: var(--pico-contrast);
  }

  /* tiles should not shift when selected */
  .tile:not(.selected):hover {
    background: var(--pico-secondary-hover);
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
  }

  .bank-card {
    padding: 1rem;
    margin: 0;
    background: var(--pico-card-background-color);
    border-radius: 8px;
    border: 1px solid var(--pico-muted-border-color);
  }

  .bank-card h4 {
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

  .hotel-chain.tower {
    border-color: #e74c3c;
    background: rgba(231, 76, 60, 0.1);
  }
  .hotel-chain.luxor {
    border-color: #f39c12;
    background: rgba(243, 156, 18, 0.1);
  }
  .hotel-chain.american {
    border-color: #3498db;
    background: rgba(52, 152, 219, 0.1);
  }
  .hotel-chain.worldwide {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.1);
  }
  .hotel-chain.festival {
    border-color: #1abc9c;
    background: rgba(26, 188, 156, 0.1);
  }
  .hotel-chain.imperial {
    border-color: #e67e22;
    background: rgba(230, 126, 34, 0.1);
  }
  .hotel-chain.continental {
    border-color: #2ecc71;
    background: rgba(46, 204, 113, 0.1);
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

  .hotel-size {
    font-size: 0.85rem;
    color: var(--pico-muted-color);
  }

  .hotel-stock {
    font-size: 0.85rem;
    color: var(--pico-muted-color);
  }

  .hotel-price {
    font-weight: 600;
    color: var(--pico-primary);
    font-size: 0.9rem;
  }

  .players-sidebar {
    width: 280px;
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
    background: var(--pico-primary-focus);
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

  .player-stocks {
    font-size: 0.85rem;
    color: var(--pico-muted-color);
    margin-top: 0.5rem;
  }

  @media (max-width: 1400px) {
    .game-container {
      grid-template-columns: 1fr;
    }

    .bank-section,
    .players-sidebar {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
  }
`;
