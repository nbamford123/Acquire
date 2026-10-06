import './dom.ts';
import { assertEquals } from '@std/assert';

import { type GameAction, GamePhase, type PlayerView } from '@acquire/engine/types';
import '../ActionCard.ts';
import { hotelsWith, makePlayerView, settle } from './fixtures.ts';

// Renders an action card and records every action it dispatches, including the first render's
const mountCard = async (playerView: PlayerView) => {
  const actions: (GameAction | null)[] = [];
  const card = document.createElement('action-card') as HTMLElement & Record<string, unknown> & {
    updateComplete: Promise<boolean>;
  };
  card.addEventListener('set-action', (event) => actions.push((event as CustomEvent).detail));
  Object.assign(card, { user: 'nate', playerView });
  document.body.append(card);
  await settle(card);
  const root = card;
  return {
    card,
    actions,
    text: (selector: string) => root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim(),
    click: async (selector: string) => {
      (root.querySelector(selector) as HTMLButtonElement).click();
      await settle(card);
    },
  };
};

const buyTurn = makePlayerView({
  currentPhase: GamePhase.BUY_SHARES,
  hotels: hotelsWith({ Tower: { shares: 20, size: 3 } }),
});
const buyNothing = { type: 'BUY_SHARES', payload: { player: 'nate', shares: {} } } as GameAction;

Deno.test('ActionCard - buying shares', async (t) => {
  await t.step('buying nothing is ready to submit, and picks update the purchase', async () => {
    const { card, actions, text, click } = await mountCard(buyTurn);
    assertEquals(actions, [buyNothing]);
    assertEquals(text('p.picker-summary'), 'You can buy up to 3 shares, or skip buying this turn.');

    await click('button[aria-label="Tower more"]');
    assertEquals(actions.at(-1), {
      type: 'BUY_SHARES',
      payload: { player: 'nate', shares: { Tower: 1 } },
    } as GameAction);
    assertEquals(text('p.picker-summary'), '1 of 3 shares for $300, leaving you $5700.');
    card.remove();
  });

  await t.step('a poll with the same turn keeps the picks', async () => {
    const { card, actions, text, click } = await mountCard(buyTurn);
    await click('button[aria-label="Tower more"]');
    card.playerView = { ...buyTurn, lastUpdated: buyTurn.lastUpdated + 1 };
    await settle(card);
    assertEquals(actions.length, 2);
    assertEquals(text('p.picker-summary'), '1 of 3 shares for $300, leaving you $5700.');
    card.remove();
  });

  await t.step('picks reset on the next turn', async () => {
    const { card, actions, text, click } = await mountCard(buyTurn);
    await click('button[aria-label="Tower more"]');
    card.playerView = { ...buyTurn, currentTurn: buyTurn.currentTurn + 1 };
    await settle(card);
    assertEquals(actions.at(-1), buyNothing);
    assertEquals(text('p.picker-summary'), 'You can buy up to 3 shares, or skip buying this turn.');
    card.remove();
  });

  await t.step('other players wait', async () => {
    const { card, actions, text } = await mountCard({ ...buyTurn, currentPlayer: 1 });
    assertEquals(text('.picker-prompt'), 'Waiting for alice to buy shares');
    assertEquals(actions, []);
    card.remove();
  });
});

const resolveTurn = (pendingMergePlayer: number) =>
  makePlayerView({
    currentPhase: GamePhase.RESOLVE_MERGER,
    pendingMergePlayer,
    stocks: { Luxor: 3 } as PlayerView['stocks'],
    hotels: hotelsWith({ American: { shares: 10, size: 13 } }),
    mergeContext: {
      originalHotels: [],
      additionalTiles: [],
      survivingHotel: 'American',
      mergedHotel: 'Luxor',
      mergedHotelSize: 5,
      stockholderIds: pendingMergePlayer === 0 ? [0, 1] : [1, 0],
    },
  });

Deno.test('ActionCard - resolving a merger', async (t) => {
  await t.step('keeping every share is ready to submit, and sells update it', async () => {
    const { card, actions, text, click } = await mountCard(resolveTurn(0));
    assertEquals(actions, [{
      type: 'RESOLVE_MERGER',
      payload: { player: 'nate', shares: { sell: 0, trade: 0 } },
    } as GameAction]);

    await click('button[aria-label="Sell more"]');
    assertEquals(actions.at(-1), {
      type: 'RESOLVE_MERGER',
      payload: { player: 'nate', shares: { sell: 1, trade: 0 } },
    } as GameAction);
    assertEquals(
      text('p.picker-summary'),
      "You'll sell 1 Luxor share for $500 and keep 2 Luxor shares. Trades are 2 for 1.",
    );
    card.remove();
  });

  await t.step('the other stockholders see who is up', async () => {
    const { card, actions, text } = await mountCard(resolveTurn(1));
    assertEquals(
      text('.picker-prompt'),
      'Waiting for alice to sell, trade, or keep their Luxor shares',
    );
    assertEquals(actions, []);
    card.remove();
  });
});

Deno.test('ActionCard - breaking a two-way tie fills in the merged hotel', async () => {
  const { card, actions, click } = await mountCard(makePlayerView({
    currentPhase: GamePhase.BREAK_MERGER_TIE,
    hotels: hotelsWith({ Tower: { shares: 22, size: 5 }, Luxor: { shares: 20, size: 5 } }),
    mergerTieContext: { tiedHotels: ['Tower', 'Luxor'] },
    mergeContext: { originalHotels: ['Tower', 'Luxor'], additionalTiles: [] },
  }));
  // Nothing is ready until a survivor is picked
  assertEquals(actions, []);

  await click('.hotel-option:nth-of-type(2)');
  assertEquals(actions.at(-1), {
    type: 'BREAK_MERGER_TIE',
    payload: { player: 'nate', resolvedTie: { survivor: 'Luxor', merged: 'Tower' } },
  } as GameAction);
  card.remove();
});
