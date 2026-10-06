// Styles for the whole page, imported from npm so they update with the packages
import pico from '@picocss/pico/css/pico.min.css' with { type: 'text' };
import picoColors from '@picocss/pico/css/pico.colors.min.css' with { type: 'text' };
import toastify from 'toastify-js/src/toastify.css' with { type: 'text' };

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
  style.textContent = [pico, picoColors, toastify, toasts, themes, pageColor, srOnly].join('\n');
  document.head.append(style);
};
