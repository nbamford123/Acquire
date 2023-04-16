// import {
//   Hotel,
//   EconomyStockPrices,
//   StandardStockPrices,
//   LuxuryStockPrices,
// } from '../Hotel/Hotel.js';

// export class Game {
//   Hotels: Array<Hotel> = [new Hotel('Worldwide')];
// }
// ALGO
// player plays tile(x, y)
// 1) x,y touches hotel: if more than 1, doMerge
//  else add to hotel
// 2) x,y touches other tile on board that's not hotel, do createHotel (if hotels available)
// otherwise, play tile part is over
// if hotels available and unclaimed multiple tiles, also trigger createHotel
// buy stonks
// What does game have? player, tiles, hotels
