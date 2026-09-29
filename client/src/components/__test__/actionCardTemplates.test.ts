import { assertEquals } from '@std/assert';

import { completeTieSelection } from '../breakMergerTieTemplate.ts';
import {
  type BuyableHotel,
  buyableHotels,
  selectionCost,
  updateShareSelection,
} from '../buyStocksTemplate.ts';
import {
  type MergerLimits,
  mergerLimits,
  mergerSummary,
  updateMergerShares,
} from '../resolveMergerTemplate.ts';
import type { PlayerView } from '@acquire/engine/types';

Deno.test('completeTieSelection', async (t) => {
  await t.step('fills in the merged hotel when two hotels are tied', () => {
    assertEquals(completeTieSelection(['Tower', 'Luxor'], undefined, { survivor: 'Luxor' }), {
      survivor: 'Luxor',
      merged: 'Tower',
    });
  });

  await t.step('needs a merged pick when three hotels are tied', () => {
    const tied = ['Tower', 'Luxor', 'Festival'] as const;
    assertEquals(completeTieSelection([...tied], undefined, { survivor: 'Luxor' }), {
      survivor: 'Luxor',
      merged: undefined,
    });
    assertEquals(
      completeTieSelection([...tied], undefined, { survivor: 'Luxor', merged: 'Festival' }),
      { survivor: 'Luxor', merged: 'Festival' },
    );
  });

  await t.step('drops a merged pick that matches the survivor', () => {
    assertEquals(
      completeTieSelection(['Tower', 'Luxor', 'Festival'], undefined, {
        survivor: 'Luxor',
        merged: 'Luxor',
      }),
      { survivor: 'Luxor', merged: undefined },
    );
  });

  await t.step('uses the survivor already picked', () => {
    assertEquals(
      completeTieSelection(['Tower', 'Luxor'], 'American', { merged: 'Tower' }),
      { survivor: 'American', merged: 'Tower' },
    );
    assertEquals(completeTieSelection(['Tower', 'Luxor'], 'American', {}), {
      survivor: 'American',
      merged: undefined,
    });
  });

  await t.step('has nothing to fill in before a survivor is picked', () => {
    assertEquals(completeTieSelection(['Tower', 'Luxor'], undefined, {}), {
      survivor: undefined,
      merged: undefined,
    });
  });
});

const limits: MergerLimits = {
  merged: 'Luxor',
  survivor: 'American',
  held: 5,
  survivorAvailable: 2,
};

Deno.test('updateMergerShares', async (t) => {
  const none = { sell: 0, trade: 0 };

  await t.step('accepts selections within limits', () => {
    assertEquals(updateMergerShares(none, { sell: 1, trade: 4 }, limits), {
      shares: { sell: 1, trade: 4 },
    });
  });

  await t.step('ignores negative counts without an error', () => {
    assertEquals(updateMergerShares(none, { sell: -1, trade: 0 }, limits), { shares: none });
  });

  await t.step('rejects selling or trading more than held', () => {
    const current = { sell: 3, trade: 2 };
    assertEquals(updateMergerShares(current, { sell: 4, trade: 2 }, limits), {
      shares: current,
      error: 'You only have 5 Luxor shares.',
    });
  });

  await t.step('rejects trading for more survivor shares than the bank has', () => {
    const current = { sell: 0, trade: 4 };
    assertEquals(updateMergerShares(current, { sell: 0, trade: 6 }, { ...limits, held: 10 }), {
      shares: current,
      error: 'Only 2 American shares left to trade for.',
    });
  });
});

Deno.test('mergerSummary', async (t) => {
  await t.step('describes keeping everything', () => {
    assertEquals(mergerSummary({ sell: 0, trade: 0 }, limits, 500), "You'll keep 5 Luxor shares.");
  });

  await t.step('describes selling, trading, and keeping', () => {
    assertEquals(
      mergerSummary({ sell: 1, trade: 2 }, limits, 500),
      "You'll sell 1 Luxor share for $500, trade 2 Luxor shares for 1 American share and keep 2 Luxor shares.",
    );
  });

  await t.step('leaves out keeping when nothing is left', () => {
    assertEquals(
      mergerSummary({ sell: 5, trade: 0 }, limits, 500),
      "You'll sell 5 Luxor shares for $2500.",
    );
  });
});

Deno.test('mergerLimits reads the viewer shares and survivor bank', () => {
  const view = {
    stocks: { Luxor: 3 },
    hotels: { American: { shares: 7, size: 12 } },
    mergeContext: {
      survivingHotel: 'American',
      mergedHotel: 'Luxor',
      originalHotels: [],
      additionalTiles: [],
    },
  } as unknown as PlayerView;
  assertEquals(mergerLimits(view), {
    merged: 'Luxor',
    survivor: 'American',
    held: 3,
    survivorAvailable: 7,
  });
  assertEquals(mergerLimits({ ...view, mergeContext: undefined }), undefined);
});

const buyable: BuyableHotel[] = [
  { name: 'Tower', available: 2, price: 300 },
  { name: 'American', available: 10, price: 700 },
];

Deno.test('updateShareSelection', async (t) => {
  await t.step('adds and removes shares', () => {
    const { selection } = updateShareSelection({}, 'Tower', 1, buyable, 6000);
    assertEquals(selection, { Tower: 1 });
    // Zero counts are dropped, since the engine rejects them
    assertEquals(updateShareSelection(selection, 'Tower', 0, buyable, 6000), { selection: {} });
  });

  await t.step('ignores negative counts and hotels that can not be bought', () => {
    assertEquals(updateShareSelection({}, 'Tower', -1, buyable, 6000), { selection: {} });
    assertEquals(updateShareSelection({}, 'Luxor', 1, buyable, 6000), { selection: {} });
  });

  await t.step('limits purchases to 3 shares a turn', () => {
    assertEquals(updateShareSelection({ Tower: 2, American: 1 }, 'American', 2, buyable, 6000), {
      selection: { Tower: 2, American: 1 },
      error: 'You can buy up to 3 shares a turn.',
    });
  });

  await t.step('limits purchases to shares left in the bank', () => {
    assertEquals(updateShareSelection({ Tower: 2 }, 'Tower', 3, buyable, 6000), {
      selection: { Tower: 2 },
      error: 'Only 2 Tower shares are left.',
    });
  });

  await t.step('limits purchases to what the player can afford', () => {
    assertEquals(updateShareSelection({ American: 1 }, 'American', 2, buyable, 1000), {
      selection: { American: 1 },
      error: 'That costs $1400 and you have $1000.',
    });
  });
});

Deno.test('selectionCost adds up the selected shares', () => {
  assertEquals(selectionCost({}, buyable), 0);
  assertEquals(selectionCost({ Tower: 2, American: 1 }, buyable), 1300);
});

Deno.test('buyableHotels only lists hotels on the board with shares left', () => {
  const view = {
    hotels: {
      Tower: { shares: 20, size: 3 },
      Luxor: { shares: 25, size: 0 },
      American: { shares: 0, size: 8 },
    },
  } as unknown as PlayerView;
  assertEquals(buyableHotels(view), [{ name: 'Tower', available: 20, price: 300 }]);
});

