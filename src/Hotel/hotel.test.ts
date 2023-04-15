import { test, expect } from '@jest/globals';
import { Hotel } from './Hotel';
import { Tile } from '../Tile/Tile';

test("Isn't safe when created", () => {
  const hotel = new Hotel('American', 'standard');
  expect(hotel.safe).toEqual(false);
});

test('Is safe when over 11 tiles', () => {
  const hotel = new Hotel('American', 'standard');
  hotel.tiles.push(...Array.from({ length: 11 }, () => new Tile('A', 1)));
  expect(hotel.safe).toEqual(true);
});

test('Has 25 shares when created', () => {
  const hotel = new Hotel('Worldwide', 'economy');
  expect(hotel.remainingShares).toEqual(25);
});

test('Shares are all unallocated when created', () => {
  const hotel = new Hotel('Tower', 'luxury');
  expect(hotel.shares.every((s) => s.location === 'bank')).toEqual(true);
});

test('Has 15 shares when 10 are alllocated', () => {
  const hotel = new Hotel('Worldwide', 'economy');
  const allocated = hotel.allocateShares('Player1', 10);
  expect(allocated).toEqual(10);
  expect(hotel.remainingShares).toEqual(15);
});

test('Only allocates 10 shares when 11 are requested, but 10 remain', () => {
  const hotel = new Hotel('Worldwide', 'economy');
  hotel.allocateShares('Player1', 15);
  const allocated = hotel.allocateShares('Player2', 11);
  expect(allocated).toEqual(10);
  expect(hotel.remainingShares).toEqual(0);
});

test('shares are allocated to appropriate players', () => {
  const hotel = new Hotel('Worldwide', 'economy');
  hotel.allocateShares('Player1', 15);
  hotel.allocateShares('Player2', 11);
  expect(hotel.shares.filter((s) => s.location === 'Player1').length).toEqual(
    15,
  );
  expect(hotel.shares.filter((s) => s.location === 'Player2').length).toEqual(
    10,
  );
});

// Test share prices
