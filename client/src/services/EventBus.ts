// Small, explicit application event bus. Import `bus` where you need to dispatch or listen.

export const bus = new EventTarget();

/**
 * Helper dispatchers with clear intent.
 * Use these so callers don't need to construct CustomEvent each time.
 */
export const dispatchAppError = (message: string) =>
  bus.dispatchEvent(new CustomEvent<string>('app-error', { detail: message }));

export const dispatchAuthError = () => bus.dispatchEvent(new CustomEvent<void>('auth-error'));

export type AppErrorEvent = CustomEvent<string>;
export type AuthErrorEvent = CustomEvent<void>;
