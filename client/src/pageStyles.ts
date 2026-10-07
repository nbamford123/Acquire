// Styles for the whole page, imported from npm so they update with the packages
import pico from '@picocss/pico/css/pico.min.css' with { type: 'text' };
import toastify from 'toastify-js/src/toastify.css' with { type: 'text' };

// The colors the app uses from Pico's color palette (pico.colors.css), copied from Pico 2.1.1. The
// whole palette is 75 KB, which is too much to bundle for eight colors; if you need another, take
// its value from that file.
const colors = `
:root {
  --pico-color-azure-600: #02659a;
  --pico-color-blue-600: #1d59d0;
  --pico-color-green-550: #33790f;
  --pico-color-pink-550: #c72259;
  --pico-color-red-500: #d93526;
  --pico-color-red-550: #c52f21;
  --pico-color-sand-550: #6e6a60;
  --pico-color-yellow-200: #d9c800;
}
`;

// Toasts are added to the end of the page, outside every component
const toasts = `
.toastify-error {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
}
`;

// Theme adjustments, following Pico's selectors: data-theme on <html> when the player chose a
// theme, otherwise the system preference
const themes = `
/* Light mode's background is softened to reduce glare. Pico's light cards use the background
   color, so they're set back to white to stand out from it. */
@media only screen and (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    --pico-background-color: #f5f5f5;
    --pico-card-background-color: #fff;
  }
}
:root[data-theme="light"] {
  --pico-background-color: #f5f5f5;
  --pico-card-background-color: #fff;
}
/* Pico's dark muted text is just short of WCAG AA (4.5:1) on dark cards, so lighten it a little */
@media only screen and (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --pico-muted-color: #8891a3;
  }
}
:root[data-theme="dark"] {
  --pico-muted-color: #8891a3;
}
/* Board squares look recessed and tiles raised. Shadows only, so tile colors and their text
   contrast don't change; dark mode needs stronger ones, and a light top edge on tiles. */
:root {
  --slot-shadow: inset 0 2px 5px rgb(0 0 0 / 0.24), inset 0 -1px 0 rgb(255 255 255 / 0.6);
  --tile-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.4), inset 0 -3px 0 rgb(0 0 0 / 0.22),
    0 2px 3px rgb(0 0 0 / 0.25);
}
@media only screen and (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --slot-shadow: inset 0 2px 4px rgb(0 0 0 / 0.55), inset 0 -1px 0 rgb(255 255 255 / 0.04);
    --tile-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -3px 0 rgb(0 0 0 / 0.35),
      0 2px 4px rgb(0 0 0 / 0.6);
  }
}
:root[data-theme="dark"] {
  --slot-shadow: inset 0 2px 4px rgb(0 0 0 / 0.55), inset 0 -1px 0 rgb(255 255 255 / 0.04);
  --tile-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -3px 0 rgb(0 0 0 / 0.35),
    0 2px 4px rgb(0 0 0 / 0.6);
}
`;

// The page's text color, for text that sits on its own background inside a button, where Pico
// redefines --pico-color. Custom properties resolve where they're declared, so this keeps the
// root's value.
const pageColor = `
:root {
  --page-color: var(--pico-color);
}
`;

// Visually hidden, but read by screen readers
const srOnly = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

// Adds them ahead of the components' styles, which are added as each component first appears
export const addPageStyles = () => {
  const style = document.createElement('style');
  style.dataset.page = '';
  style.textContent = [pico, colors, toastify, toasts, themes, pageColor, srOnly].join('\n');
  document.head.append(style);
};
