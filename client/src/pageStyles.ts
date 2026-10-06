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

// Adds them ahead of the components' styles, which are added as each component first appears
export const addPageStyles = () => {
  const style = document.createElement('style');
  style.dataset.page = '';
  style.textContent = [pico, picoColors, toastify, toasts].join('\n');
  document.head.append(style);
};
