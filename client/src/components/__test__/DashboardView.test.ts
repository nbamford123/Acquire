import './dom.ts';
import { assertEquals } from '@std/assert';
import { stub } from '@std/testing/mock';

import { GamePhase, type GameInfo } from '@acquire/engine/types';
import '../DashboardView.ts';
import { mount, settle } from './fixtures.ts';

type Rendered = HTMLElement & { updateComplete: Promise<boolean> };

const makeGame = (id: string): GameInfo => ({
  id,
  currentPlayer: '',
  owner: 'nate',
  players: ['nate'],
  phase: GamePhase.WAITING_FOR_PLAYERS,
  lastUpdated: 100,
});

// Serves GET /api/games from games, and DELETE /api/games/:id removes the game
const serve = (games: GameInfo[]) => {
  const fetchStub = stub(globalThis, 'fetch', (input, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      const id = String(input).split('/').pop();
      games = games.filter((game) => game.id !== id);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ games })));
  });
  return { [Symbol.dispose]: () => fetchStub.restore() };
};

// Waits for the dashboard and each of its game cards to render
const settleAll = async (dashboard: Rendered) => {
  await settle(dashboard);
  const cards = [...dashboard.shadowRoot!.querySelectorAll('game-card')] as Rendered[];
  await Promise.all(cards.map((card) => card.updateComplete));
  return cards;
};

const cardIds = (cards: Rendered[]) =>
  cards.map((card) => card.shadowRoot!.querySelector('h3')?.textContent);

Deno.test('DashboardView - deleting a game removes its card', async () => {
  using _server = serve([makeGame('game-a'), makeGame('game-b'), makeGame('game-c')]);
  const dashboard = await mount('dashboard-view', {
    user: 'nate',
    showConfirmationDialog: () => Promise.resolve(true),
  }) as Rendered;
  let cards = await settleAll(dashboard);
  assertEquals(cardIds(cards), ['game-a', 'game-b', 'game-c']);

  (cards[0].shadowRoot!.querySelector('button.contrast') as HTMLButtonElement).click();
  // The delete, then the reload
  await settle(dashboard);
  cards = await settleAll(dashboard);
  assertEquals(cardIds(cards), ['game-b', 'game-c']);
  dashboard.remove();
});
