// Small service to persist and retrieve the current user (username/email).
// Uses localStorage so the name persists across page reloads for this SPA.

const STORAGE_KEY = 'acquire.currentUser';

export const getUser = (): string | null => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw ? raw : null;
  } catch (e) {
    // localStorage may be unavailable in some environments; fail gracefully
    console.warn('Unable to read user from localStorage', e);
    return null;
  }
};

export const setUser = (user: string) => {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, user);
  } catch (e) {
    console.warn('Unable to persist user to localStorage', e);
  }
};

export const clearUser = () => {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Unable to clear user from localStorage', e);
  }
};

export default {
  getUser,
  setUser,
  clearUser,
};
