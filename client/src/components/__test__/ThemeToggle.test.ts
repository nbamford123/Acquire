import './dom.ts';
import { assertEquals } from '@std/assert';
import { stub } from '@std/testing/mock';

import '../ThemeToggle.ts';
import { mount, settle } from './fixtures.ts';

Deno.test('ThemeToggle - switches the theme and says what it switches to', async () => {
  localStorage.removeItem('acquire.theme');
  delete document.documentElement.dataset.theme;
  using _matchMedia = stub(globalThis, 'matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList);

  const toggle = await mount('theme-toggle', {});
  const button = () => toggle.querySelector('button')!;
  assertEquals(button().getAttribute('aria-label'), 'Switch to dark theme');

  button().click();
  await settle(toggle);
  assertEquals(document.documentElement.dataset.theme, 'dark');
  assertEquals(button().getAttribute('aria-label'), 'Switch to light theme');

  button().click();
  await settle(toggle);
  assertEquals(document.documentElement.dataset.theme, undefined);
  assertEquals(button().getAttribute('aria-label'), 'Switch to dark theme');
  toggle.remove();
});
