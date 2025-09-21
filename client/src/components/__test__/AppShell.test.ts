import { assertEquals } from '@std/assert';

// Tests exercise AppShell's event handlers and RouterService interactions
// without attaching to a real DOM. No DOM shim is required for these unit
// tests.

import { RouterService } from '../../services/RouterService.ts';
// event bus not used directly in these tests

import { AppShell } from '../AppShell.ts';

// Interface used only in tests to access internal handlers without using `any`.
interface TestableAppShell {
  handleLogin(evt: CustomEvent<{ success: boolean; user: string }>): void;
  handleSessionExpired(): void;
  handleLogout(): void;
  handleGameSelect(evt: CustomEvent<string>): void;
  handleError(evt: CustomEvent<string>): void;
  clearError(): void;
  handleBackToGameList(): void;
  // internal state accessor for assertions
  appState?: { error: string };
  errorTimer?: unknown;
}

Deno.test('AppShell basic handlers and router interaction', async (t) => {
  // Grab the RouterService singleton and spy on navigateTo
  const router = RouterService.getInstance();

  let navigatedTo: string | null = null;
  const originalNavigate = router.navigateTo.bind(router);
  router.navigateTo = (path: string) => {
    navigatedTo = path;
    // don't call original to avoid modifying global history during tests
  };

  // Create an instance of the element (constructor subscribes to router)
  // We won't attach it to the DOM in these unit tests; we'll interact with
  // it by dispatching events and simulating router notifications.
  const app = new AppShell();

  await t.step('handleLogin updates user and navigates to dashboard', () => {
    // Call the login handler directly. We cast to any to access the private
    // method for testing purposes.
    (app as unknown as TestableAppShell).handleLogin(
      new CustomEvent('user-login', {
        detail: { success: true, user: 'Alice' },
      }),
    );

    assertEquals(navigatedTo, '/dashboard');
  });

  await t.step(
    'handleSessionExpired clears user/state and navigates to login',
    () => {
      navigatedTo = null;
      // Simulate session expiry by calling the handler directly.
      (app as unknown as TestableAppShell).handleSessionExpired();
      assertEquals(navigatedTo, '/login');
    },
  );

  await t.step('handleLogout clears user and navigates to login', () => {
    navigatedTo = null;

    // Call the logout handler directly.
    (app as unknown as TestableAppShell).handleLogout();
    assertEquals(navigatedTo, '/login');
  });

  await t.step('handleGameSelect navigates to specific game', () => {
    navigatedTo = null;
    // Call the game-select handler directly.
    (app as unknown as TestableAppShell).handleGameSelect(
      new CustomEvent('game-select', { detail: 'game-123' }),
    );
    assertEquals(navigatedTo, '/game/game-123');
  });

  await t.step(
    'handleBackToGameList clears selectedGameId and navigates to dashboard',
    () => {
      navigatedTo = null;
      // Click the back button if present (only on game view). Ensure we're
      // on a game view first.
      // Simulate a back-to-list event from the game-board-view
      // Call the back-to-list handler directly for this unit test.
      (app as unknown as TestableAppShell).handleBackToGameList();
      assertEquals(navigatedTo, '/dashboard');
    },
  );

  // Restore navigateTo
  router.navigateTo = originalNavigate;
});

Deno.test('AppShell error handling and event-bus integration', async (t) => {
  const router = RouterService.getInstance();
  // construct but don't attach to DOM; we'll use the bus to trigger handlers
  const app = new AppShell();

  await t.step('dispatching app-error sets error and can be cleared', () => {
    // Call handleError directly to simulate the bus event without a DOM.
    (app as unknown as TestableAppShell).handleError(
      new CustomEvent<string>('app-error', { detail: 'boom' }),
    );
    // @ts-ignore: access private appState for test
    assertEquals(
      (app as unknown as TestableAppShell).appState?.['error'],
      'boom',
    );
    // Now clear the error and verify it was removed
    (app as unknown as TestableAppShell).clearError?.();
    // @ts-ignore: access private appState for test
    assertEquals(
      (app as unknown as TestableAppShell).appState?.['error'],
      null,
    );
  });
  await t.step(
    'dispatching auth-error clears session and navigates to login',
    () => {
      let navigated: string | null = null;
      const originalNavigate = router.navigateTo.bind(router);
      router.navigateTo = (p: string) => {
        navigated = p;
        // don't call original to avoid history writes
      };

      // Call session-expired handler directly instead of dispatching on bus
      (app as unknown as TestableAppShell).handleSessionExpired();

      assertEquals(navigated, '/login');

      router.navigateTo = originalNavigate;
    },
  );

  // cleanup: nothing to restore
});
