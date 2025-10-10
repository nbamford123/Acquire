// TODO(me): domain specific prefixes, e.g. TILE_ PLAYER_
export const GameErrorCodes = {
  // Add player errors
  PLAYERS_MAX: 'PLAYERS_MAX',
  PLAYER_INVALID_NAME: 'INVALID_PLAYER_NAME',
  PLAYER_EXISTS: 'PLAYER_EXISTS',

  // game errors
  GAME_INVALID_ACTION: 'INVALID_ACTION',
  GAME_NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  GAME_PROCESSING_ERROR: 'PROCESSING_ERROR',

  // Resource errors
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',

  // Placement errors
  INVALID_LOCATION: 'INVALID_LOCATION',
  LOCATION_OCCUPIED: 'LOCATION_OCCUPIED',
  DISTANCE_RULE_VIOLATION: 'DISTANCE_RULE_VIOLATION',

  // Trade errors
  INVALID_TRADE_OFFER: 'INVALID_TRADE_OFFER',

  // System errors
  VERSION_CONFLICT: 'VERSION_CONFLICT',

  // Unknown error
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeValue = typeof GameErrorCodes[keyof typeof GameErrorCodes];

export class GameError extends Error {
  public code: ErrorCodeValue;

  constructor(message: string, errorCode: ErrorCodeValue) {
    super(message);
    this.name = 'GameError';
    this.code = errorCode;
    Object.setPrototypeOf(this, GameError.prototype);
  }
}
