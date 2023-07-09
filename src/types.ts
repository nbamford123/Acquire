export type HOTEL_NAME =
  | 'Worldwide'
  | 'Sackson'
  | 'Festival'
  | 'Imperial'
  | 'American'
  | 'Continental'
  | 'Tower';

export type HOTEL_TYPE = 'economy' | 'standard' | 'luxury';
export type TileLocation = string | 'board' | 'bag' | 'dead';

export type ITile = { row: number; col: number; location: TileLocation };
export type IPlayer = {
  money: number;
  stocks: { hotel: string; shares: number };
};
export type IHotel = {
  name: HOTEL_NAME;
  type: HOTEL_TYPE;
  remainingShares: number;
  safe: boolean;
  sharePrice: number;
  tiles: Array<ITile>;
};

export type IPlayerShares = {
  [hotel: string]: number;
};
export type GameState =
  | {
      tiles: Array<ITile>;
      players: Array<string>;
      hotels: Array<IHotel>;
      player: {
        money: number;
        shares: IPlayerShares;
      };
    }
  | { error: string };

export type StartGameState = {
  playerOrder: Array<string>;
  tiles: { [player: string]: ITile };
};
