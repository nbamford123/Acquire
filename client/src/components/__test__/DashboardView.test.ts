import './dom.ts';
import { assertEquals } from '@std/assert';
import { stub } from '@std/testing/mock';

import { GamePhase, type GameInfo, type PlayerStats } from '@acquire/engine/types';
import '../DashboardView.ts';
import { updatedLabel } from '../GameCard.ts';
import { mount, settle } from './fixtures.ts';

type Rendered = HTMLElement & { updateComplete: Promise<boolean> };

const makeGame = (id: string, overrides: Partial<GameInfo> = {}): GameInfo => ({
  id,
  currentPlayer: '',
  owner: 'nate',
  players: ['nate'],
  phase: GamePhase.WAITING_FOR_PLAYERS,
  lastUpdated: 100,
  ...overrides,
});

// Serves GET /api/games from games and GET /api/leaderboard from leaderboard, DELETE /api/games/:id
// removes the game, and POSTed actions are recorded
const serve = (games: GameInfo[], leaderboard: PlayerStats[] = []) => {
  const posted: unknown[] = [];
  const fetchStub = stub(globalThis, 'fetch', (input, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      const id = String(input).split('/').pop();
      games = games.filter((game) => game.id !== id);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (init?.method === 'POST') {
      posted.push(JSON.parse(String(init.body)).action);
      return Promise.resolve(new Response(JSON.stringify({})));
    }
    if (String(input).endsWith('/api/leaderboard')) {
      return Promise.resolve(new Response(JSON.stringify({ players: leaderboard })));
    }
    return Promise.resolve(new Response(JSON.stringify({ games })));
  });
  return { posted, [Symbol.dispose]: () => fetchStub.restore() };
};

// What a card shows: its status and the label of each action
const describeCard = (card: Rendered) => {
  const root = card;
  return {
    status: root.querySelector('.game-status')?.textContent?.trim(),
    actions: [...root.querySelectorAll('.card-actions button, .card-actions a')].map((el) =>
      el.textContent?.trim()
    ),
  };
};

const mountDashboard = async (confirmed = true) => {
  const asked: string[] = [];
  const dashboard = await mount('dashboard-view', {
    user: 'nate',
    showConfirmationDialog: (title: string) => {
      asked.push(title);
      return Promise.resolve(confirmed);
    },
  }) as Rendered;
  return { dashboard, asked, cards: await settleAll(dashboard) };
};

// Waits for the dashboard and each of its game cards to render
const settleAll = async (dashboard: Rendered) => {
  await settle(dashboard);
  const cards = [...dashboard.querySelectorAll('game-card')] as Rendered[];
  await Promise.all(cards.map((card) => card.updateComplete));
  return cards;
};

const cardIds = (cards: Rendered[]) =>
  cards.map((card) => card.querySelector('h3')?.textContent);

Deno.test('DashboardView - deleting a game removes its card', async () => {
  using _server = serve([makeGame('game-a'), makeGame('game-b'), makeGame('game-c')]);
  const dashboard = await mount('dashboard-view', {
    user: 'nate',
    showConfirmationDialog: () => Promise.resolve(true),
  }) as Rendered;
  let cards = await settleAll(dashboard);
  assertEquals(cardIds(cards), ['game-a', 'game-b', 'game-c']);

  const deleteButton = [...cards[0].querySelectorAll('button')].find((button) =>
    button.textContent?.trim() === 'Delete Game'
  )!;
  deleteButton.click();
  // The delete, then the reload
  await settle(dashboard);
  cards = await settleAll(dashboard);
  assertEquals(cardIds(cards), ['game-b', 'game-c']);
  dashboard.remove();
});

Deno.test('updatedLabel - shows the date only for games not updated today', () => {
  const now = new Date(2026, 9, 5, 20, 0).getTime();
  const time = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date(2026, 9, 5, 16, 29);
  assertEquals(updatedLabel(today.getTime(), now), `Updated ${time(today)}`);
  const earlier = new Date(2026, 8, 29, 16, 29);
  const day = earlier.toLocaleDateString([], { month: 'short', day: 'numeric' });
  assertEquals(updatedLabel(earlier.getTime(), now), `Updated ${day}, ${time(earlier)}`);
});

Deno.test('DashboardView - cards show what you can do in each game', async () => {
  using _server = serve([
    makeGame('mine', { players: ['nate', 'alice'] }),
    makeGame('joined', { owner: 'alice', players: ['alice', 'nate'] }),
    makeGame('open', { owner: 'alice', players: ['alice'] }),
    makeGame('full', { owner: 'alice', players: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    makeGame('started', {
      owner: 'alice',
      players: ['alice', 'bob'],
      phase: GamePhase.PLAY_TILE,
      currentPlayer: 'bob',
    }),
  ]);
  const { dashboard, cards } = await mountDashboard();
  assertEquals(cards.map(describeCard), [
    {
      status: 'Waiting for players',
      actions: ['Play Game', 'Start Game', 'Delete Game'],
    },
    { status: 'Waiting for players', actions: ['Play Game', 'Leave Game'] },
    { status: 'Waiting for players', actions: ['Join Game'] },
    { status: 'Full', actions: ['View Game'] },
    { status: "bob's turn", actions: ['View Game'] },
  ]);
  const meta = (card: Rendered) => card.querySelector('.game-meta')?.textContent;
  assertEquals(meta(cards[0])?.includes('Your game'), true);
  assertEquals(meta(cards[1])?.includes('Hosted by alice'), true);
  // Play is a real link, so it can open in a new tab
  assertEquals(cards[0].querySelector('a')?.getAttribute('href'), '/game/mine');
  dashboard.remove();
});

Deno.test('DashboardView - joining, starting, and leaving ask first', async () => {
  using server = serve([
    makeGame('mine', { players: ['nate', 'alice'] }),
    makeGame('joined', { owner: 'alice', players: ['alice', 'nate'] }),
    makeGame('open', { owner: 'alice', players: ['alice'] }),
  ]);
  const click = (card: Rendered, label: string) =>
    ([...card.querySelectorAll('button')].find((button) =>
      button.textContent?.trim() === label
    ) as HTMLButtonElement).click();

  // Cancelling does nothing
  const declined = await mountDashboard(false);
  click(declined.cards[2], 'Join Game');
  click(declined.cards[0], 'Start Game');
  click(declined.cards[1], 'Leave Game');
  await settleAll(declined.dashboard);
  assertEquals(declined.asked, ['Join Game', 'Start Game', 'Leave Game']);
  assertEquals(server.posted, []);
  declined.dashboard.remove();

  const accepted = await mountDashboard(true);
  click(accepted.cards[2], 'Join Game');
  click(accepted.cards[0], 'Start Game');
  click(accepted.cards[1], 'Leave Game');
  await settleAll(accepted.dashboard);
  assertEquals(server.posted, [
    { type: 'ADD_PLAYER', payload: {} },
    { type: 'START_GAME', payload: {} },
    { type: 'REMOVE_PLAYER', payload: {} },
  ]);
  accepted.dashboard.remove();
});

Deno.test('DashboardView - the leaderboard lists totals and marks you', async () => {
  using _server = serve([], [
    { name: 'alice', gamesPlayed: 3, gamesWon: 2, earnings: 61200 },
    { name: 'nate', gamesPlayed: 2, gamesWon: 1, earnings: 30500 },
  ]);
  const { dashboard } = await mountDashboard();
  const rows = [...dashboard.querySelectorAll('.leaderboard tbody tr')];
  assertEquals(
    rows.map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim())),
    [['alice', '3', '2', '$61,200'], ['nate', '2', '1', '$30,500']],
  );
  assertEquals(rows.map((row) => row.classList.contains('you')), [false, true]);
  dashboard.remove();
});

Deno.test('DashboardView - the leaderboard says when no games have finished', async () => {
  using _server = serve([]);
  const { dashboard } = await mountDashboard();
  assertEquals(
    dashboard.querySelector('.leaderboard')?.textContent?.trim(),
    'No finished games yet.',
  );
  dashboard.remove();
});
