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

// Pico's dark muted text is just short of WCAG AA (4.5:1) on dark cards, so lighten it a little
const mutedText = `
@media only screen and (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --pico-muted-color: #8891a3;
  }
}
[data-theme="dark"] {
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
  style.textContent = [pico, picoColors, toastify, toasts, mutedText, pageColor, srOnly].join('\n');
  document.head.append(style);
};
