import { assertEquals } from '@std/assert';
import { clearUser, getUser, setUser } from '../UserService.ts';

Deno.test.beforeEach(() => {
  // @ts-ignore: clean up test-only global
  delete globalThis.localStorage;
});
Deno.test('UserService - basic get/set/clear', () => {
  // Provide a simple localStorage mock
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  } as unknown as Storage;

  // Attach mock
  globalThis.localStorage = mockLocalStorage;

  // Initially null
  assertEquals(getUser(), null);

  // Set user
  setUser('alice@example.com');
  assertEquals(getUser(), 'alice@example.com');

  // Clear user
  clearUser();
  assertEquals(getUser(), null);

  // Clean up
  // @ts-ignore: clean up test-only global
  delete globalThis.localStorage;
});

Deno.test('UserService - handles localStorage errors gracefully', () => {
  // Stub localStorage to throw on getItem/setItem/removeItem
  const throwing = {
    getItem: () => {
      throw new Error('nope');
    },
    setItem: () => {
      throw new Error('nope');
    },
    removeItem: () => {
      throw new Error('nope');
    },
  } as unknown as Storage;

  // @ts-ignore: test-only global override to simulate throwing localStorage
  globalThis.localStorage = throwing;

  // Nothing should throw; getUser returns null when reading fails
  assertEquals(getUser(), null);

  // setUser and clearUser should not throw either
  setUser('bob@example.com');
  clearUser();

  // Clean up
  // @ts-ignore: clean up test-only global
  delete globalThis.localStorage;
});
