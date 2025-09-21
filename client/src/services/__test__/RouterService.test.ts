import { assertEquals, assertInstanceOf } from '@std/assert';
import { RouterService } from '../RouterService.ts';
import type { Route } from '../../types.ts';

Deno.test('RouterService', async (t) => {
  await t.step('should implement singleton pattern', () => {
    // Reset singleton instance for clean test
    // deno-lint-ignore no-explicit-any
    (RouterService as any).instance = undefined;

    const router1 = RouterService.getInstance();
    const router2 = RouterService.getInstance();

    assertEquals(router1, router2);
    assertInstanceOf(router1, RouterService);
  });

  await t.step('should parse root path as login route', () => {
    const router = RouterService.getInstance();
    const route = router.parseRoute('/');

    assertEquals(route, { view: 'login' });
  });

  await t.step('should parse empty path as login route', () => {
    const router = RouterService.getInstance();
    const route = router.parseRoute('');

    assertEquals(route, { view: 'login' });
  });

  await t.step('should parse dashboard path as game-list route', () => {
    const router = RouterService.getInstance();
    const route = router.parseRoute('/dashboard');

    assertEquals(route, { view: 'game-list' });
  });

  await t.step('should parse game path with ID as game route', () => {
    const router = RouterService.getInstance();
    const route = router.parseRoute('/game/123');

    assertEquals(route, { view: 'game', gameId: '123' });
  });

  await t.step('should return null for invalid paths', () => {
    const router = RouterService.getInstance();

    const route1 = router.parseRoute('/invalid');
    const route2 = router.parseRoute('/game'); // missing gameId
    const route3 = router.parseRoute('/dashboard/extra');

    assertEquals(route1, null);
    assertEquals(route2, null);
    assertEquals(route3, null);
  });

  await t.step('should handle paths with trailing slashes', () => {
    const router = RouterService.getInstance();

    const route1 = router.parseRoute('/dashboard/');
    const route2 = router.parseRoute('/game/456/');

    assertEquals(route1, { view: 'game-list' });
    assertEquals(route2, { view: 'game', gameId: '456' });
  });

  await t.step('should handle complex game IDs', () => {
    const router = RouterService.getInstance();

    const route1 = router.parseRoute('/game/abc-123-def');
    const route2 = router.parseRoute('/game/game_456');
    const route3 = router.parseRoute('/game/GAME789');

    assertEquals(route1, { view: 'game', gameId: 'abc-123-def' });
    assertEquals(route2, { view: 'game', gameId: 'game_456' });
    assertEquals(route3, { view: 'game', gameId: 'GAME789' });
  });

  await t.step('should support subscriber pattern', () => {
    const router = RouterService.getInstance();
    let callCount = 0;
    let lastRoute: Route | null = null;

    const callback = (route: Route) => {
      callCount++;
      lastRoute = route;
    };

    const unsubscribe = router.subscribe(callback);

    // Manually trigger notification to test subscriber
    router.notifyListeners({ view: 'login' });

    assertEquals(callCount, 1);
    assertEquals(lastRoute, { view: 'login' });

    // Test unsubscribe
    unsubscribe();
    router.notifyListeners({ view: 'game-list' });

    // Should not increment after unsubscribe
    assertEquals(callCount, 1);
    assertEquals(lastRoute, { view: 'login' }); // Should still be the old value
  });

  await t.step('should support multiple subscribers', () => {
    const router = RouterService.getInstance();
    const receivedRoutes: Route[] = [];

    const callback1 = (route: Route) => {
      receivedRoutes.push({ ...route });
    };

    const callback2 = (route: Route) => {
      receivedRoutes.push({ ...route });
    };

    const unsubscribe1 = router.subscribe(callback1);
    const unsubscribe2 = router.subscribe(callback2);

    router.notifyListeners({ view: 'game', gameId: '789' });

    assertEquals(receivedRoutes.length, 2);
    assertEquals(receivedRoutes[0].view, 'game');
    assertEquals(receivedRoutes[0].gameId, '789');
    assertEquals(receivedRoutes[1].view, 'game');
    assertEquals(receivedRoutes[1].gameId, '789');

    unsubscribe1();
    unsubscribe2();
  });

  await t.step('should handle edge cases in path parsing', () => {
    const router = RouterService.getInstance();

    // Test paths with multiple slashes
    assertEquals(router.parseRoute('//dashboard//'), { view: 'game-list' });
    assertEquals(router.parseRoute('//game//test-id//'), {
      view: 'game',
      gameId: 'test-id',
    });

    // Test paths with special characters in game ID
    assertEquals(router.parseRoute('/game/test@123'), {
      view: 'game',
      gameId: 'test@123',
    });
    assertEquals(router.parseRoute('/game/test.game.123'), {
      view: 'game',
      gameId: 'test.game.123',
    });

    // Test case sensitivity
    assertEquals(router.parseRoute('/Dashboard'), null);
    assertEquals(router.parseRoute('/GAME/123'), null);
  });

  await t.step('should handle whitespace and encoded characters', () => {
    const router = RouterService.getInstance();

    // Test URL encoded characters
    assertEquals(router.parseRoute('/game/test%20game'), {
      view: 'game',
      gameId: 'test%20game',
    });
    assertEquals(router.parseRoute('/game/test+game'), {
      view: 'game',
      gameId: 'test+game',
    });
  });
});
