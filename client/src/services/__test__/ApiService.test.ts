import { assertEquals } from '@std/assert';
import { restore, stub } from '@std/testing/mock';
import { ActionTypes, createAction } from '@acquire/engine/types';
import { createGame, deleteGame, getGame, listGames, login, sendAction } from '../ApiService.ts';
import { bus } from '../EventBus.ts';

// Mock fetch responses
const createMockResponse = (data: unknown, status = 200, ok = true) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
};

const createMockErrorResponse = (status: number, errorData?: unknown) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => errorData ? Promise.resolve(errorData) : Promise.reject(new Error('Invalid JSON')),
  } as Response);
};

// Records the events sent while running fn
const collectEvents = async (fn: () => Promise<unknown>) => {
  const dispatched: string[] = [];
  const messages: string[] = [];
  const onAppError = (event: Event) => {
    dispatched.push('app-error');
    messages.push((event as CustomEvent<string>).detail);
  };
  const onAuthError = () => dispatched.push('auth-error');
  bus.addEventListener('app-error', onAppError);
  bus.addEventListener('auth-error', onAuthError);
  try {
    await fn();
    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    bus.removeEventListener('app-error', onAppError);
    bus.removeEventListener('auth-error', onAuthError);
  }
  return { dispatched, messages };
};

Deno.test('ApiService - requests', async (t) => {
  await t.step('login posts the email and returns the user', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => createMockResponse({ success: true, user: 'nate' }),
    );

    assertEquals(await login('nate@example.com'), { success: true, user: 'nate' });
    assertEquals(fetchStub.calls[0].args[0], '/api/login');
    assertEquals(fetchStub.calls[0].args[1]?.method, 'POST');
    assertEquals(fetchStub.calls[0].args[1]?.headers, { 'Content-Type': 'application/json' });
    assertEquals(fetchStub.calls[0].args[1]?.body, '{"email":"nate@example.com"}');

    restore();
  });

  await t.step('listGames gets the game list', async () => {
    const fetchStub = stub(globalThis, 'fetch', () => createMockResponse({ games: [] }));

    assertEquals(await listGames(), { games: [] });
    assertEquals(fetchStub.calls[0].args[0], '/api/games');

    restore();
  });

  await t.step('createGame posts with no body', async () => {
    const fetchStub = stub(globalThis, 'fetch', () => createMockResponse({ gameId: 'a-b' }));

    assertEquals(await createGame(), { gameId: 'a-b' });
    assertEquals(fetchStub.calls[0].args[0], '/api/games');
    assertEquals(fetchStub.calls[0].args[1]?.method, 'POST');
    assertEquals(fetchStub.calls[0].args[1]?.body, undefined);

    restore();
  });

  await t.step('getGame gets the game by id', async () => {
    const response = { game: { gameId: 'brave-otter' } };
    const fetchStub = stub(globalThis, 'fetch', () => createMockResponse(response));

    assertEquals(await getGame('brave-otter') as unknown, response);
    assertEquals(fetchStub.calls[0].args[0], '/api/games/brave-otter');

    restore();
  });

  await t.step('sendAction posts the action without a player', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => createMockResponse({ action: 'PLAY_TILE' }),
    );
    const action = createAction(ActionTypes.PLAY_TILE, { tile: { row: 0, col: 1 } });

    assertEquals(await sendAction('brave-otter', action), { action: 'PLAY_TILE' });
    assertEquals(fetchStub.calls[0].args[0], '/api/games/brave-otter');
    assertEquals(fetchStub.calls[0].args[1]?.method, 'POST');
    assertEquals(
      fetchStub.calls[0].args[1]?.body,
      '{"action":{"type":"PLAY_TILE","payload":{"tile":{"row":0,"col":1}}}}',
    );

    restore();
  });

  await t.step('deleteGame says whether the game was deleted', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response(null, { status: 204 })),
    );
    assertEquals(await deleteGame('brave-otter'), true);
    assertEquals(fetchStub.calls[0].args[0], '/api/games/brave-otter');
    assertEquals(fetchStub.calls[0].args[1]?.method, 'DELETE');
    restore();

    stub(globalThis, 'fetch', () => createMockErrorResponse(403, { error: 'Not yours' }));
    const { messages } = await collectEvents(async () => {
      assertEquals(await deleteGame('brave-otter'), false);
    });
    assertEquals(messages, ['Not yours']);
    restore();
  });
});

Deno.test('ApiService - errors', async (t) => {
  await t.step('returns null on 4xx/5xx errors', async () => {
    stub(globalThis, 'fetch', () => createMockErrorResponse(404));
    await collectEvents(async () => {
      assertEquals(await getGame('missing'), null);
      assertEquals(await sendAction('missing', createAction(ActionTypes.START_GAME, {})), null);
    });
    restore();
  });

  await t.step('silent requests skip app-error but still dispatch auth-error', async () => {
    const { dispatched } = await collectEvents(async () => {
      stub(globalThis, 'fetch', () => createMockErrorResponse(500, { error: 'Boom' }));
      assertEquals(await getGame('poll', { silent: true }), null);
      restore();

      stub(globalThis, 'fetch', () => createMockErrorResponse(401));
      assertEquals(await getGame('poll', { silent: true }), null);
      restore();
    });
    assertEquals(dispatched, ['auth-error']);
  });

  await t.step('dispatches auth-error on 401 status', async () => {
    stub(globalThis, 'fetch', () => createMockErrorResponse(401));
    const { dispatched } = await collectEvents(async () => {
      assertEquals(await listGames(), null);
    });
    assertEquals(dispatched, ['auth-error', 'app-error']);
    restore();
  });

  await t.step('dispatches app-error with the server message', async () => {
    stub(globalThis, 'fetch', () => createMockErrorResponse(400, { error: 'Custom error message' }));
    const { messages } = await collectEvents(() => listGames());
    assertEquals(messages, ['Custom error message']);
    restore();
  });

  await t.step('dispatches app-error with a default message when JSON parsing fails', async () => {
    stub(globalThis, 'fetch', () => createMockErrorResponse(500));
    const { messages } = await collectEvents(() => listGames());
    assertEquals(messages, ['Unknown Error']);
    restore();
  });
});
