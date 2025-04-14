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
export type StartGameState = {
  tiles: { [player: string]: ITile };
};

// Part of the fun is counting up the shares and giving money at the end... can animate on client side
export type EndGameState =
  | {
      players: Record<
        string,
        {
          hotels: {
            hotel: string;
            shares: number;
            payout: number;
          };
          totalCash: number;
        }
      >;
      winner: string;
    }
  | { error: string };

export enum GAME_STATE {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  PLAY_TILE = 'PLAY_TILE',
  BUY_STOCKS = 'BUY_STOCKS',
  START_HOTEL = 'START_HOTEL',
  MERGE = 'MERGE',
  GAME_OVER = 'GAME_OVER',
}

export const isError = (
  state: ValidGameState | ErrorState,
): state is ErrorState => {
  return (state as ErrorState).error !== undefined;
};
export type ValidGameState = {
  tiles: Array<ITile>;
  // In order of play
  players: Array<string>;
  hotels: Array<IHotel>;
  player: {
    money: number;
    shares: IPlayerShares;
  };
  startGameState: StartGameState;
  endGameState: EndGameState;
  gameState: GAME_STATE;
  // player name who is up
  turn: string;
};
export type ErrorState = { error: string };
export type GameState = ValidGameState | ErrorState;
