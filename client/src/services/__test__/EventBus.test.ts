import { assertEquals, assertInstanceOf } from '@std/assert';
import {
  type AppErrorEvent,
  type AuthErrorEvent,
  bus,
  dispatchAppError,
  dispatchAuthError,
} from '../EventBus.ts';

Deno.test('EventBus', async (t) => {
  await t.step('should export a global EventTarget instance', () => {
    assertInstanceOf(bus, EventTarget);
  });

  await t.step('should dispatch app-error events with message', async () => {
    let receivedEvent: AppErrorEvent | null = null;

    const listener = (event: Event) => {
      receivedEvent = event as AppErrorEvent;
    };

    bus.addEventListener('app-error', listener);

    const testMessage = 'Test error message';
    dispatchAppError(testMessage);

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(receivedEvent!.type, 'app-error');
    assertEquals(receivedEvent!.detail, testMessage);

    bus.removeEventListener('app-error', listener);
  });

  await t.step('should dispatch auth-error events without detail', async () => {
    let receivedEvent: AuthErrorEvent | null = null;

    const listener = (event: Event) => {
      receivedEvent = event as AuthErrorEvent;
    };

    bus.addEventListener('auth-error', listener);

    dispatchAuthError();

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(receivedEvent!.type, 'auth-error');
    assertEquals(receivedEvent!.detail, undefined);

    bus.removeEventListener('auth-error', listener);
  });

  await t.step('should support multiple listeners for the same event', async () => {
    const receivedMessages: string[] = [];

    const listener1 = (event: Event) => {
      const appEvent = event as AppErrorEvent;
      receivedMessages.push(`listener1: ${appEvent.detail}`);
    };

    const listener2 = (event: Event) => {
      const appEvent = event as AppErrorEvent;
      receivedMessages.push(`listener2: ${appEvent.detail}`);
    };

    bus.addEventListener('app-error', listener1);
    bus.addEventListener('app-error', listener2);

    const testMessage = 'Multi-listener test';
    dispatchAppError(testMessage);

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(receivedMessages.length, 2);
    assertEquals(receivedMessages.includes(`listener1: ${testMessage}`), true);
    assertEquals(receivedMessages.includes(`listener2: ${testMessage}`), true);

    bus.removeEventListener('app-error', listener1);
    bus.removeEventListener('app-error', listener2);
  });

  await t.step('should allow removing event listeners', async () => {
    let eventReceived = false;

    const listener = () => {
      eventReceived = true;
    };

    bus.addEventListener('app-error', listener);
    bus.removeEventListener('app-error', listener);

    dispatchAppError('Should not be received');

    // Give event loop a chance to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(eventReceived, false);
  });

  await t.step('should handle rapid successive events', async () => {
    const receivedMessages: string[] = [];

    const listener = (event: Event) => {
      const appEvent = event as AppErrorEvent;
      receivedMessages.push(appEvent.detail);
    };

    bus.addEventListener('app-error', listener);

    // Dispatch multiple events rapidly
    for (let i = 0; i < 5; i++) {
      dispatchAppError(`Message ${i}`);
    }

    // Give event loop a chance to process all events
    await new Promise((resolve) => setTimeout(resolve, 10));

    assertEquals(receivedMessages.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(receivedMessages[i], `Message ${i}`);
    }

    bus.removeEventListener('app-error', listener);
  });
});
