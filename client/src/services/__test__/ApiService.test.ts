import { assertEquals } from '@std/assert';
import { restore, stub } from '@std/testing/mock';
import { getApi, postApi } from '../ApiService.ts';
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

Deno.test('ApiService - getApi', async (t) => {
  await t.step(
    'should make GET request and return data on success',
    async () => {
      const mockData = { id: 1, name: 'test' };
      const fetchStub = stub(
        globalThis,
        'fetch',
        () => createMockResponse(mockData),
      );

      const result = await getApi('/test');

      assertEquals(result, mockData);
      assertEquals(fetchStub.calls[0].args[0], '/test');

      restore();
    },
  );

  await t.step('should return null on 4xx/5xx errors', async () => {
    stub(
      globalThis,
      'fetch',
      () => createMockErrorResponse(404),
    );

    const result = await getApi('/not-found');

    assertEquals(result, null);

    restore();
  });

  await t.step('should dispatch auth-error on 401 status', async () => {
    let authErrorDispatched = false;

    const listener = () => {
      authErrorDispatched = true;
    };

    bus.addEventListener('auth-error', listener);

    stub(
      globalThis,
      'fetch',
      () => createMockErrorResponse(401),
    );

    const result = await getApi('/unauthorized');

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(result, null);
    assertEquals(authErrorDispatched, true);

    bus.removeEventListener('auth-error', listener);
    restore();
  });

  await t.step(
    'should dispatch app-error with custom error message',
    async () => {
      let receivedErrorMessage = '';

      const listener = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        receivedErrorMessage = customEvent.detail;
      };

      bus.addEventListener('app-error', listener);

      const errorData = { error: 'Custom error message' };
      stub(globalThis, 'fetch', () => createMockErrorResponse(400, errorData));

      const result = await getApi('/bad-request');

      // Give event loop a chance to process
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertEquals(result, null);
      assertEquals(receivedErrorMessage, 'Custom error message');

      bus.removeEventListener('app-error', listener);
      restore();
    },
  );

  await t.step(
    'should dispatch app-error with default message when JSON parsing fails',
    async () => {
      let receivedErrorMessage = '';

      const listener = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        receivedErrorMessage = customEvent.detail;
      };

      bus.addEventListener('app-error', listener);

      stub(
        globalThis,
        'fetch',
        () => createMockErrorResponse(500),
      );

      const result = await getApi('/server-error');

      // Give event loop a chance to process
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertEquals(result, null);
      assertEquals(receivedErrorMessage, 'Unknown Error');

      bus.removeEventListener('app-error', listener);
      restore();
    },
  );
});

Deno.test('ApiService - postApi', async (t) => {
  await t.step(
    'should make POST request with JSON body and return data on success',
    async () => {
      const mockData = { success: true, id: 123 };
      const requestBody = { name: 'test', value: 42 };

      const fetchStub = stub(
        globalThis,
        'fetch',
        () => createMockResponse(mockData),
      );

      const result = await postApi('/create', requestBody);

      assertEquals(result, mockData);
      assertEquals(fetchStub.calls[0].args[0], '/create');
      assertEquals(fetchStub.calls[0].args[1]?.method, 'POST');
      assertEquals(fetchStub.calls[0].args[1]?.headers, {
        'Content-Type': 'application/json',
      });
      assertEquals(
        fetchStub.calls[0].args[1]?.body,
        JSON.stringify(requestBody),
      );

      restore();
    },
  );

  await t.step('should return null on error responses', async () => {
    const requestBody = { name: 'test' };
    stub(globalThis, 'fetch', () => createMockErrorResponse(422));

    const result = await postApi('/invalid', requestBody);

    assertEquals(result, null);

    restore();
  });

  await t.step('should handle empty request body', async () => {
    const mockData = { success: true };
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => createMockResponse(mockData),
    );

    const result = await postApi('/empty', {});

    assertEquals(result, mockData);
    assertEquals(fetchStub.calls[0].args[1]?.body, '{}');

    restore();
  });

  await t.step('should dispatch auth-error on 401 status', async () => {
    let authErrorDispatched = false;

    const listener = () => {
      authErrorDispatched = true;
    };

    bus.addEventListener('auth-error', listener);

    stub(globalThis, 'fetch', () => createMockErrorResponse(401));

    const result = await postApi('/unauthorized', { data: 'test' });

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(result, null);
    assertEquals(authErrorDispatched, true);

    bus.removeEventListener('auth-error', listener);
    restore();
  });

  await t.step(
    'should handle complex nested objects in request body',
    async () => {
      const mockData = { created: true };
      const complexBody = {
        user: { name: 'John', age: 30 },
        preferences: { theme: 'dark', notifications: true },
        tags: ['important', 'urgent'],
      };

      const fetchStub = stub(
        globalThis,
        'fetch',
        () => createMockResponse(mockData),
      );

      const result = await postApi('/complex', complexBody);

      assertEquals(result, mockData);
      assertEquals(
        fetchStub.calls[0].args[1]?.body,
        JSON.stringify(complexBody),
      );

      restore();
    },
  );
});
