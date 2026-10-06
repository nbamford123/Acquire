import '../../components/__test__/dom.ts';
import { assertEquals } from '@std/assert';
import { stub } from '@std/testing/mock';

import { applyTheme, currentTheme, toggleTheme } from '../ThemeService.ts';

// Pretends the system prefers dark or light, and starts with nothing remembered
const system = (dark: boolean) => {
  localStorage.removeItem('acquire.theme');
  delete document.documentElement.dataset.theme;
  const matchMedia = stub(globalThis, 'matchMedia', () => ({
    matches: dark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList);
  return { [Symbol.dispose]: () => matchMedia.restore() };
};

const htmlTheme = () => document.documentElement.dataset.theme;

Deno.test('ThemeService - follows the system until the player chooses', () => {
  using _system = system(true);
  applyTheme();
  assertEquals(currentTheme(), 'dark');
  assertEquals(htmlTheme(), undefined);
});

Deno.test('ThemeService - a choice is remembered and applied', () => {
  using _system = system(false);
  assertEquals(toggleTheme(), 'dark');
  assertEquals(htmlTheme(), 'dark');
  assertEquals(localStorage.getItem('acquire.theme'), 'dark');
  // As on the next visit
  delete document.documentElement.dataset.theme;
  applyTheme();
  assertEquals(htmlTheme(), 'dark');
  assertEquals(currentTheme(), 'dark');
});

Deno.test("ThemeService - choosing the system's theme goes back to following it", () => {
  using _system = system(false);
  toggleTheme();
  assertEquals(toggleTheme(), 'light');
  assertEquals(htmlTheme(), undefined);
  assertEquals(localStorage.getItem('acquire.theme'), null);
});

Deno.test('ThemeService - ignores anything else remembered', () => {
  using _system = system(true);
  localStorage.setItem('acquire.theme', 'sepia');
  applyTheme();
  assertEquals(currentTheme(), 'dark');
  assertEquals(htmlTheme(), undefined);
});
