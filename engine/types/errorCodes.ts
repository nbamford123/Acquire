// Why the engine rejected an action. Players see the error's message, not its code.
export const GameErrorCodes = {
  // The move isn't allowed: wrong turn or phase, or it breaks a rule
  GAME_INVALID_ACTION: 'GAME_INVALID_ACTION',
  // The game state is inconsistent, which is a bug rather than a bad move
  GAME_PROCESSING_ERROR: 'GAME_PROCESSING_ERROR',
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
