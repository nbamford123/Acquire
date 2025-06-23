import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  assignSharesToPlayer,
  getHotelsByNames,
  getTiedHotels,
  hotelSafe,
  hotelTiles,
  initializeHotels,
  majorityMinorityValue,
  remainingShares,
  returnSharesToBank,
  sharePrice,
} from '../../domain/hotelOperations.ts';
import {
  type BoardTile,
  GameError,
  GameErrorCodes,
  type Hotel,
  type HOTEL_NAME,
  type HOTEL_TYPE,
  type Share,
} from '@/types/index.ts';
import { SAFE_HOTEL_SIZE } from '../../../shared/types/gameConfig.ts';

// Helper function to create a hotel
function createHotel(
  name: HOTEL_NAME,
  type: HOTEL_TYPE,
  shareLocations: Array<'bank' | number> = Array(25).fill('bank'),
): Hotel {
  const shares: Share[] = shareLocations.map((location) => ({ location }));
  return { name, type, shares };
}

// Helper function to create board tiles
function createBoardTile(row: number, col: number, hotel?: HOTEL_NAME): BoardTile {
  const tile: BoardTile = { row, col, location: 'board' };
  if (hotel) {
    tile.hotel = hotel;
  }
  return tile;
}

// Helper function to create hotel tiles for testing
function createHotelTiles(hotelName: HOTEL_NAME, count: number): BoardTile[] {
  return Array.from({ length: count }, (_, i) => ({
    row: Math.floor(i / 9),
    col: i % 9,
    location: 'board' as const,
    hotel: hotelName,
  }));
}

Deno.test('initializeHotels', async (t) => {
  await t.step('creates all 7 hotels with correct properties', () => {
    const hotels = initializeHotels();

    assertEquals(hotels.length, 7);

    // Check each hotel has correct name, type, and 25 shares
    const expectedHotels = [
      { name: 'Worldwide', type: 'economy' },
      { name: 'Sackson', type: 'economy' },
      { name: 'Festival', type: 'standard' },
      { name: 'Imperial', type: 'standard' },
      { name: 'American', type: 'standard' },
      { name: 'Continental', type: 'luxury' },
      { name: 'Tower', type: 'luxury' },
    ];

    expectedHotels.forEach((expected, index) => {
      assertEquals(hotels[index].name, expected.name);
      assertEquals(hotels[index].type, expected.type);
      assertEquals(hotels[index].shares.length, 25);

      // All shares should start in bank
      hotels[index].shares.forEach((share) => {
        assertEquals(share.location, 'bank');
      });
    });
  });
});

Deno.test('remainingShares', async (t) => {
  await t.step('counts shares in bank correctly', () => {
    const hotel = createHotel('Worldwide', 'economy');
    assertEquals(remainingShares(hotel), 25);
  });

  await t.step('counts remaining shares when some are owned by players', () => {
    const shareLocations = [
      ...Array(10).fill('bank'),
      ...Array(5).fill(1), // player 1 owns 5
      ...Array(3).fill(2), // player 2 owns 3
      ...Array(7).fill('bank'),
    ];
    const hotel = createHotel('Worldwide', 'economy', shareLocations);

    assertEquals(remainingShares(hotel), 17); // 10 + 7 = 17 in bank
  });

  await t.step('returns 0 when all shares are owned', () => {
    const shareLocations = Array(25).fill(1); // all owned by player 1
    const hotel = createHotel('Worldwide', 'economy', shareLocations);

    assertEquals(remainingShares(hotel), 0);
  });
});

Deno.test('assignSharesToPlayer', async (t) => {
  await t.step('assigns single share to player', () => {
    const shares: Share[] = [
      { location: 'bank' },
      { location: 'bank' },
      { location: 'bank' },
    ];

    const result = assignSharesToPlayer(shares, 1, 1);

    assertEquals(result[0].location, 1);
    assertEquals(result[1].location, 'bank');
    assertEquals(result[2].location, 'bank');
  });

  await t.step('assigns multiple shares to player', () => {
    const shares: Share[] = Array(5).fill(null).map(() => ({ location: 'bank' }));

    const result = assignSharesToPlayer(shares, 2, 3);

    assertEquals(result[0].location, 2);
    assertEquals(result[1].location, 2);
    assertEquals(result[2].location, 2);
    assertEquals(result[3].location, 'bank');
    assertEquals(result[4].location, 'bank');
  });

  await t.step('defaults to assigning 1 share when count not specified', () => {
    const shares: Share[] = [
      { location: 'bank' },
      { location: 'bank' },
    ];

    const result = assignSharesToPlayer(shares, 3);

    assertEquals(result[0].location, 3);
    assertEquals(result[1].location, 'bank');
  });

  await t.step('does not assign more shares than available in bank', () => {
    const shares: Share[] = [
      { location: 'bank' },
      { location: 1 }, // already owned
      { location: 'bank' },
    ];

    const result = assignSharesToPlayer(shares, 2, 5); // try to assign 5, only 2 available

    assertEquals(result[0].location, 2);
    assertEquals(result[1].location, 1); // unchanged
    assertEquals(result[2].location, 2);
  });

  await t.step('does not mutate original shares array', () => {
    const shares: Share[] = [
      { location: 'bank' },
      { location: 'bank' },
    ];
    const originalShares = shares.map((s) => ({ ...s }));

    const result = assignSharesToPlayer(shares, 1, 1);

    assertEquals(shares, originalShares); // original unchanged
    assertEquals(result !== shares, true); // new array returned
  });
});

Deno.test('returnSharesToBank', async (t) => {
  await t.step('returns single share to bank', () => {
    const shares: Share[] = [
      { location: 1 },
      { location: 1 },
      { location: 2 },
    ];

    const result = returnSharesToBank(shares, 1, 1);

    assertEquals(result[0].location, 'bank');
    assertEquals(result[1].location, 1);
    assertEquals(result[2].location, 2);
  });

  await t.step('returns multiple shares to bank', () => {
    const shares: Share[] = [
      { location: 1 },
      { location: 1 },
      { location: 1 },
      { location: 2 },
    ];

    const result = returnSharesToBank(shares, 1, 2);

    assertEquals(result[0].location, 'bank');
    assertEquals(result[1].location, 'bank');
    assertEquals(result[2].location, 1);
    assertEquals(result[3].location, 2);
  });

  await t.step('defaults to returning 1 share when count not specified', () => {
    const shares: Share[] = [
      { location: 1 },
      { location: 1 },
    ];

    const result = returnSharesToBank(shares, 1);

    assertEquals(result[0].location, 'bank');
    assertEquals(result[1].location, 1);
  });

  await t.step('does not return more shares than player owns', () => {
    const shares: Share[] = [
      { location: 1 },
      { location: 2 },
      { location: 1 },
    ];

    const result = returnSharesToBank(shares, 1, 5); // try to return 5, player only has 2

    assertEquals(result[0].location, 'bank');
    assertEquals(result[1].location, 2);
    assertEquals(result[2].location, 'bank');
  });

  await t.step('does not mutate original shares array', () => {
    const shares: Share[] = [
      { location: 1 },
      { location: 1 },
    ];
    const originalShares = shares.map((s) => ({ ...s }));

    const result = returnSharesToBank(shares, 1, 1);

    assertEquals(shares, originalShares); // original unchanged
    assertEquals(result !== shares, true); // new array returned
  });
});

Deno.test('hotelTiles', async (t) => {
  await t.step('returns tiles belonging to specified hotel', () => {
    const tiles: BoardTile[] = [
      createBoardTile(0, 0, 'Worldwide'),
      createBoardTile(0, 1, 'Sackson'),
      createBoardTile(0, 2, 'Worldwide'),
      createBoardTile(0, 3), // no hotel
    ];

    const result = hotelTiles('Worldwide', tiles);

    assertEquals(result.length, 2);
    assertEquals(result[0], tiles[0]);
    assertEquals(result[1], tiles[2]);
  });

  await t.step('returns empty array when hotel has no tiles', () => {
    const tiles: BoardTile[] = [
      createBoardTile(0, 0, 'Sackson'),
      createBoardTile(0, 1), // no hotel
    ];

    const result = hotelTiles('Worldwide', tiles);

    assertEquals(result.length, 0);
  });

  await t.step('handles empty tiles array', () => {
    const result = hotelTiles('Worldwide', []);
    assertEquals(result.length, 0);
  });
});

Deno.test('sharePrice', async (t) => {
  await t.step('calculates price for economy hotel with 2 tiles', () => {
    const hotel = createHotel('Worldwide', 'economy');
    const tiles = createHotelTiles('Worldwide', 2);

    const price = sharePrice(hotel, tiles);
    assertEquals(price, 200); // economy hotel, 2 tiles
  });

  await t.step('calculates price for standard hotel with 5 tiles', () => {
    const hotel = createHotel('Festival', 'standard');
    const tiles = createHotelTiles('Festival', 5);

    const price = sharePrice(hotel, tiles);
    assertEquals(price, 600); // standard hotel, 5 tiles
  });

  await t.step('calculates price for luxury hotel with 10 tiles', () => {
    const hotel = createHotel('Continental', 'luxury');
    const tiles = createHotelTiles('Continental', 10);

    const price = sharePrice(hotel, tiles);
    assertEquals(price, 800); // luxury hotel, 10 tiles
  });

  await t.step('calculates price for very large hotel', () => {
    const hotel = createHotel('Tower', 'luxury');
    const tiles = createHotelTiles('Tower', 50); // larger than any bracket

    const price = sharePrice(hotel, tiles);
    assertEquals(price, 1200); // luxury hotel, max price
  });

  await t.step('handles hotel with no tiles by using size 0', () => {
    const hotel = createHotel('Worldwide', 'economy');
    const tiles: BoardTile[] = []; // no tiles for this hotel

    // When hotel has 0 tiles, it should use the first price bracket (size 2)
    const price = sharePrice(hotel, tiles);
    assertEquals(price, 200); // economy hotel, 0 tiles falls into first bracket (2)
  });
});

Deno.test('majorityMinorityValue', async (t) => {
  await t.step('returns correct majority and minority bonuses for economy hotel', () => {
    const hotel = createHotel('Worldwide', 'economy');
    const tiles = createHotelTiles('Worldwide', 3);

    const [majority, minority] = majorityMinorityValue(hotel, tiles);
    assertEquals(majority, 3000);
    assertEquals(minority, 1500);
  });

  await t.step('returns correct majority and minority bonuses for standard hotel', () => {
    const hotel = createHotel('Festival', 'standard');
    const tiles = createHotelTiles('Festival', 20);

    const [majority, minority] = majorityMinorityValue(hotel, tiles);
    assertEquals(majority, 8000);
    assertEquals(minority, 4000);
  });

  await t.step('returns correct majority and minority bonuses for luxury hotel', () => {
    const hotel = createHotel('Continental', 'luxury');
    const tiles = createHotelTiles('Continental', 50);

    const [majority, minority] = majorityMinorityValue(hotel, tiles);
    assertEquals(majority, 12000);
    assertEquals(minority, 6000);
  });
});

Deno.test('hotelSafe', async (t) => {
  await t.step('returns false for hotel smaller than safe size', () => {
    const tiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE - 1);

    const result = hotelSafe('Worldwide', tiles);
    assertEquals(result, false);
  });

  await t.step('returns true for hotel equal to safe size', () => {
    const tiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE);

    const result = hotelSafe('Worldwide', tiles);
    assertEquals(result, true);
  });

  await t.step('returns true for hotel larger than safe size', () => {
    const tiles = createHotelTiles('Worldwide', SAFE_HOTEL_SIZE + 5);

    const result = hotelSafe('Worldwide', tiles);
    assertEquals(result, true);
  });

  await t.step('returns false for hotel with no tiles', () => {
    const tiles: BoardTile[] = [];

    const result = hotelSafe('Worldwide', tiles);
    assertEquals(result, false);
  });
});

Deno.test('getTiedHotels', async (t) => {
  await t.step('returns hotels with same size as target hotel', () => {
    const tiles: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      ...createHotelTiles('Sackson', 5),
      ...createHotelTiles('Festival', 3),
      ...createHotelTiles('Imperial', 7),
    ];

    const hotels: HOTEL_NAME[] = ['Worldwide', 'Sackson', 'Festival', 'Imperial'];
    const result = getTiedHotels('Worldwide', hotels, tiles);

    assertEquals(result.length, 2);
    assertEquals(result.includes('Worldwide'), true);
    assertEquals(result.includes('Sackson'), true);
  });

  await t.step('returns only target hotel when no ties', () => {
    const tiles: BoardTile[] = [
      ...createHotelTiles('Worldwide', 5),
      ...createHotelTiles('Sackson', 3),
      ...createHotelTiles('Festival', 7),
    ];

    const hotels: HOTEL_NAME[] = ['Worldwide', 'Sackson', 'Festival'];
    const result = getTiedHotels('Worldwide', hotels, tiles);

    assertEquals(result.length, 1);
    assertEquals(result[0], 'Worldwide');
  });

  await t.step('handles hotels with zero tiles', () => {
    const tiles: BoardTile[] = [
      ...createHotelTiles('Festival', 3),
    ];

    const hotels: HOTEL_NAME[] = ['Worldwide', 'Sackson', 'Festival'];
    const result = getTiedHotels('Worldwide', hotels, tiles); // Worldwide has 0 tiles

    assertEquals(result.length, 2); // Worldwide and Sackson both have 0 tiles
    assertEquals(result.includes('Worldwide'), true);
    assertEquals(result.includes('Sackson'), true);
  });

  await t.step('handles all hotels tied', () => {
    const tiles: BoardTile[] = [
      ...createHotelTiles('Worldwide', 4),
      ...createHotelTiles('Sackson', 4),
      ...createHotelTiles('Festival', 4),
    ];

    const hotels: HOTEL_NAME[] = ['Worldwide', 'Sackson', 'Festival'];
    const result = getTiedHotels('Worldwide', hotels, tiles);

    assertEquals(result.length, 3);
    assertEquals(result.includes('Worldwide'), true);
    assertEquals(result.includes('Sackson'), true);
    assertEquals(result.includes('Festival'), true);
  });
});

Deno.test('getHotelsByNames', async (t) => {
  await t.step('returns hotels matching the provided names', () => {
    const hotels = initializeHotels();
    const names: HOTEL_NAME[] = ['Worldwide', 'Festival', 'Tower'];

    const result = getHotelsByNames(hotels, names);

    assertEquals(result.length, 3);
    assertEquals(result[0].name, 'Worldwide');
    assertEquals(result[1].name, 'Festival');
    assertEquals(result[2].name, 'Tower');
  });

  await t.step('returns hotels in the order of provided names', () => {
    const hotels = initializeHotels();
    const names: HOTEL_NAME[] = ['Tower', 'Worldwide', 'Sackson'];

    const result = getHotelsByNames(hotels, names);

    assertEquals(result.length, 3);
    assertEquals(result[0].name, 'Tower');
    assertEquals(result[1].name, 'Worldwide');
    assertEquals(result[2].name, 'Sackson');
  });

  await t.step('throws error when hotel name not found', () => {
    const hotels = initializeHotels();
    const names: HOTEL_NAME[] = ['Worldwide', 'NonExistent' as HOTEL_NAME];

    const error = assertThrows(
      () => getHotelsByNames(hotels, names),
      GameError,
      'Hotel not found: NonExistent',
    );
    assertEquals(error.code, GameErrorCodes.GAME_PROCESSING_ERROR);
  });

  await t.step('handles empty names array', () => {
    const hotels = initializeHotels();
    const names: HOTEL_NAME[] = [];

    const result = getHotelsByNames(hotels, names);
    assertEquals(result.length, 0);
  });

  await t.step('handles single hotel name', () => {
    const hotels = initializeHotels();
    const names: HOTEL_NAME[] = ['Continental'];

    const result = getHotelsByNames(hotels, names);

    assertEquals(result.length, 1);
    assertEquals(result[0].name, 'Continental');
    assertEquals(result[0].type, 'luxury');
  });
});
